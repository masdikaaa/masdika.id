'use client';
import { useUrlNumber, useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from 'react';
import { User, Activity, FileText, Settings, ShieldAlert, ArrowLeft, Database, Link2, Key, Server, CheckCircle, XCircle, Clock, AlertTriangle, Ban, Box, Globe, Music, HardDrive, Edit3, Terminal, UploadCloud, Mail, Send, Eye, Paperclip, Trash2, RefreshCw, Filter, Search, History } from 'lucide-react';
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

const formatInvoiceNumber = (num: string) => {
  if (!num) return num;
  if (num.startsWith('INV-PAYG-')) return num;
  const match = num.match(/^INV-(\d+)-(\d+)-(?:VPS-)?PAYG$/i);
  if (match) return `INV-PAYG-${match[1]}-${match[2]}`;
  if (num.endsWith('-VPS-PAYG')) return `INV-PAYG-${num.replace(/-VPS-PAYG$/i, '').replace(/^INV-/, '')}`;
  if (num.endsWith('-PAYG') && !num.startsWith('INV-PAYG-')) return `INV-PAYG-${num.replace(/-PAYG$/i, '').replace(/^INV-/, '')}`;
  return num;
};

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
            <tr className={cn("text-xs uppercase tracking-wider border-b font-semibold", isDark ? "bg-slate-900/60 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              {columns.map((c: any, i: number) => (
                <th key={i} className={`p-4 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
            {paginatedData.map(renderRow)}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className={cn("p-4 border-t", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
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



  // Edit Service Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  // Email Logs State (WHMCS-style)
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [viewingEmail, setViewingEmail] = useState<any | null>(null);
  const [deleteEmailId, setDeleteEmailId] = useState<number | null>(null);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);
  const [emailCurrentPage, setEmailCurrentPage] = useUrlNumber("emailPage", 1);
  const emailsPerPage = 10;

  const fetchEmailLogs = async () => {
    setLoadingEmails(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/emails`);
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailLogs(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load email logs:", err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleDeleteEmailLog = async () => {
    if (!deleteEmailId) return;
    setIsDeletingEmail(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/emails/${deleteEmailId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Email log deleted successfully");
        setEmailLogs(prev => prev.filter(e => e.id !== deleteEmailId));
        setDeleteEmailId(null);
      } else {
        toast.error("Failed to delete email log");
      }
    } catch {
      toast.error("An error occurred while deleting email log");
    } finally {
      setIsDeletingEmail(false);
    }
  };

  // Activity Logs State (WHMCS-style Activity Log)
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logPagination, setLogPagination] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10
  });
  const [logFilterDate, setLogFilterDate] = useState("");
  const [logFilterUsername, setLogFilterUsername] = useState("Any");
  const [logFilterDescription, setLogFilterDescription] = useState("");
  const [logFilterIp, setLogFilterIp] = useState("");
  const [distinctLogUsernames, setDistinctLogUsernames] = useState<string[]>(["Any", "System"]);
  const [jumpToLogPage, setJumpToLogPage] = useState("1");

  const fetchActivityLogs = async (page = 1, limit = logPagination.limit) => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (logFilterDate) params.set("date", logFilterDate);
      if (logFilterUsername && logFilterUsername !== "Any") params.set("username", logFilterUsername);
      if (logFilterDescription.trim()) params.set("search", logFilterDescription.trim());
      if (logFilterIp.trim()) params.set("ip", logFilterIp.trim());

      const res = await fetch(`/api/admin/users/${userId}/logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setActivityLogs(data.data || []);
        setLogPagination(data.pagination || { totalRecords: 0, totalPages: 1, currentPage: page, limit });
        if (data.usernames && data.usernames.length > 0) {
          setDistinctLogUsernames(["Any", ...data.usernames]);
        }
        setJumpToLogPage(String(data.pagination?.currentPage || page));
      }
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };



  const formatLogDescription = (desc: string) => {
    if (!desc) return "-";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = desc.split(urlRegex);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline break-all"
              >
                {part}
              </a>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  const formatEmailDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch {
      return dateStr;
    }
  };

  const formatEmailPreviewHtml = (rawBody: string) => {
    if (!rawBody) return "";

    const fontInject = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
        body, table, td, p, span, div, a, li, strong, b, h1, h2, h3, h4, h5, h6 {
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        code, pre {
          font-family: 'JetBrains Mono', Consolas, Monaco, monospace !important;
        }
      </style>
    `;

    // If it's already a full HTML document (e.g. templates, email blasts, system emails)
    const isFullHtml = /<!DOCTYPE|<html|<body|<table/i.test(rawBody);
    if (isFullHtml) {
      if (rawBody.includes("<head>")) {
        return rawBody.replace("<head>", `<head>${fontInject}`);
      }
      if (rawBody.includes("<html")) {
        return rawBody.replace(/<html[^>]*>/, `$&<head>${fontInject}</head>`);
      }
      return `${fontInject}${rawBody}`;
    }

    // For plain text or simple snippets, render original body directly without any container or wrapper
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${fontInject}
  <style>
    body {
      margin: 0;
      padding: 16px;
      line-height: 1.6;
      background-color: #ffffff;
      color: #0f172a;
    }
  </style>
</head>
<body>
  ${rawBody}
</body>
</html>`;
  };

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

  const allServices = user ? [
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
            {vps.cpuCores}C • {vps.ramGb}G • {vps.diskGb}G • {vps.bandwidthMbps || 100} Mbps • IP: {vps.assignedIps?.length ? (vps.assignedIps.length > 1 ? `${vps.assignedIps[0].ipAddress} (+${vps.assignedIps.length - 1})` : vps.assignedIps[0].ipAddress) : 'Unassigned'}
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

  useEffect(() => {
    if (activeTab === 'emails') {
      fetchEmailLogs();
    }
    if (activeTab === 'logs') {
      fetchActivityLogs(1);
    }
  }, [activeTab, userId]);




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
          
          <div className={cn("w-14 h-14 rounded-full overflow-hidden border shrink-0 flex items-center justify-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200")}>
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
          <div className={cn("px-4 py-2 rounded-xl border text-sm", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
            <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Balance:</span> <span className={cn("font-bold ml-1", isDark ? "text-cyan-400" : "text-cyan-700")}>{formatRupiah(user.balance)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn("p-2 sm:p-4 rounded-2xl border flex items-center justify-between gap-4 w-full overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("flex items-center gap-1.5 p-1 rounded-xl border w-full overflow-x-auto scrollbar-none", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
          {[
            { key: 'summary', label: 'Summary', icon: User },
            { key: 'services', label: 'Services', icon: Server },
            { key: 'invoices', label: 'Invoices', icon: FileText },
            { key: 'emails', label: 'Emails', icon: Mail },
            { key: 'logs', label: 'Logs', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
                  activeTab === tab.key
                    ? (isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-400 shadow-sm" : "bg-cyan-50 text-cyan-700 border border-cyan-500 shadow-sm")
                    : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent" : "text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        
        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={cn("p-6 rounded-2xl border md:col-span-2", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
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
                
                <div className={cn("sm:col-span-2 border-t pt-4 mt-2", isDark ? "border-slate-800/80" : "border-slate-200")}>
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

                <div className={cn("sm:col-span-2 border-t pt-4 mt-2", isDark ? "border-slate-800/80" : "border-slate-200")}>
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
              <div className={cn("p-6 rounded-2xl border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
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
          <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>

            <div className={cn("p-5 border-b flex justify-between items-center", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
              <h3 className={cn("font-semibold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}><Server className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} /> All Products & Services</h3>
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
                <tr key={`${svc.type}-${svc.id}-${idx}`} className={cn("transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                  <td className="p-4">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className={cn("p-2 rounded-lg border flex-shrink-0", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
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
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border whitespace-nowrap flex items-center gap-1.5", isDark ? "bg-[#060b14] border-slate-800 hover:bg-white/5 text-zinc-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")}
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
          <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
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
                <tr key={inv.id} className={cn("transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                  <td className={cn("p-4 text-sm font-medium break-all max-w-[120px] sm:max-w-none", isDark ? "text-cyan-400" : "text-cyan-700")}>{formatInvoiceNumber(inv.invoiceNumber)}</td>
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

        {/* EMAILS TAB (WHMCS-style Email Log) */}
        {activeTab === 'emails' && (
          <div className="space-y-4">
            {/* Header Toolbar matching WHMCS Image 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 px-1">
              <div className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                <span className="font-bold text-cyan-400">{emailLogs.length}</span> Records Found, Page {emailCurrentPage} of {Math.max(1, Math.ceil(emailLogs.length / emailsPerPage))}
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {Math.ceil(emailLogs.length / emailsPerPage) > 1 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={cn("whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>Jump to Page:</span>
                    <div className="w-[72px] sm:w-20">
                      <Select
                        value={emailCurrentPage}
                        onChange={(val) => setEmailCurrentPage(Number(val))}
                        options={Array.from({ length: Math.ceil(emailLogs.length / emailsPerPage) }, (_, i) => ({
                          value: i + 1,
                          label: String(i + 1)
                        }))}
                        className={cn("!h-8 !py-0 !px-2.5 text-xs rounded-lg", isDark ? "!bg-[#060b14] !border-slate-800 hover:!border-slate-700 !text-white" : "!bg-white !border-slate-200 !text-slate-900")}
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/admin/email-blast?userId=${userId}`)}
                  className="h-8 flex items-center gap-1.5 px-3.5 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </button>
              </div>
            </div>

            {/* Table matching WHMCS Image 1 */}
            <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={cn("text-xs uppercase tracking-wider font-semibold border-b", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
                      <th className="py-3.5 px-4 w-44 font-semibold whitespace-nowrap">Date</th>
                      <th className="py-3.5 px-4 font-semibold">Subject</th>
                      <th className="py-3.5 px-4 w-24 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y text-sm", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
                    {loadingEmails ? (
                      <tr>
                        <td colSpan={3} className="py-16 text-center">
                          <div className="flex justify-center items-center h-48">
                            <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
                          </div>
                        </td>
                      </tr>
                    ) : emailLogs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={cn("p-12 text-center text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>
                          No email logs found for this customer.
                        </td>
                      </tr>
                    ) : (
                      emailLogs.slice((emailCurrentPage - 1) * emailsPerPage, emailCurrentPage * emailsPerPage).map((log) => (
                        <tr key={log.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                          <td className={cn("py-3.5 px-4 text-xs font-mono whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-600")}>
                            {formatEmailDate(log.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => setViewingEmail(log)}
                              className={cn(
                                "text-left font-medium hover:underline flex items-center gap-1.5 transition-colors cursor-pointer",
                                isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-700 hover:text-cyan-800"
                              )}
                            >
                              <span>{log.subject}</span>
                              <Paperclip className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingEmail(log)}
                                title="View Message"
                                className={cn(
                                  "p-1.5 rounded-lg border transition-all cursor-pointer",
                                  isDark ? "border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400" : "border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 text-cyan-700 shadow-xs"
                                )}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteEmailId(log.id)}
                                title="Delete Email Log"
                                className={cn(
                                  "p-1.5 rounded-lg border transition-all cursor-pointer",
                                  isDark ? "border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 text-red-400" : "border-slate-200 hover:border-red-300 hover:bg-red-50 text-red-600 shadow-xs"
                                )}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination matching WHMCS Image 1 */}
              {Math.ceil(emailLogs.length / emailsPerPage) > 1 && (
                <div className={cn("p-3 px-4 border-t flex items-center justify-between", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}>
                  <button
                    type="button"
                    disabled={emailCurrentPage === 1}
                    onClick={() => setEmailCurrentPage(p => Math.max(1, p - 1))}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs",
                      isDark ? "bg-[#0b1322] border-slate-700 text-zinc-300 hover:bg-white/5" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    « Previous Page
                  </button>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Page {emailCurrentPage} of {Math.ceil(emailLogs.length / emailsPerPage)}
                  </span>
                  <button
                    type="button"
                    disabled={emailCurrentPage >= Math.ceil(emailLogs.length / emailsPerPage)}
                    onClick={() => setEmailCurrentPage(p => Math.min(Math.ceil(emailLogs.length / emailsPerPage), p + 1))}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs",
                      isDark ? "bg-[#0b1322] border-slate-700 text-zinc-300 hover:bg-white/5" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    Next Page »
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOGS TAB (WHMCS-Style Activity & System Logs) */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* WHMCS Search / Filter Card */}
            <div className={cn("p-5 rounded-2xl border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
                {/* Left Column */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className={cn("w-24 text-xs font-semibold shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>Date</label>
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={logFilterDate}
                        onChange={(e) => setLogFilterDate(e.target.value)}
                        className={cn(
                          "w-full h-9 px-3 text-xs rounded-xl border transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                          isDark ? "bg-[#060b14] border-slate-800 text-white [color-scheme:dark]" : "bg-slate-50 border-slate-300 text-slate-800 [color-scheme:light]"
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className={cn("w-24 text-xs font-semibold shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>Username</label>
                    <div className="flex-1">
                      <Select
                        value={logFilterUsername}
                        onChange={(val) => setLogFilterUsername(val)}
                        options={distinctLogUsernames.map(u => ({ value: u, label: u }))}
                        className={cn(
                          "!h-9 !py-0 !px-3 text-xs rounded-xl transition-all",
                          isDark ? "!bg-[#060b14] !border-slate-800 hover:!border-slate-700 !text-white" : "!bg-slate-50 !border-slate-300 hover:!border-slate-400 !text-slate-800"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className={cn("w-24 text-xs font-semibold shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>Description</label>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={logFilterDescription}
                        onChange={(e) => setLogFilterDescription(e.target.value)}
                        placeholder="Search description, order, payment..."
                        className={cn(
                          "w-full h-9 px-3 text-xs rounded-xl border transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                          isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className={cn("w-24 text-xs font-semibold shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>IP Address</label>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={logFilterIp}
                        onChange={(e) => setLogFilterIp(e.target.value)}
                        placeholder="e.g. 103.147..."
                        className={cn(
                          "w-full h-9 px-3 text-xs rounded-xl border transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono",
                          isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-start gap-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <button
                  type="button"
                  onClick={() => fetchActivityLogs(1)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter Logs</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogFilterDate("");
                    setLogFilterUsername("Any");
                    setLogFilterDescription("");
                    setLogFilterIp("");
                    fetchActivityLogs(1);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                    isDark ? "border-slate-800 text-zinc-400 hover:text-white hover:bg-white/5" : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Reset Filter
                </button>
              </div>
            </div>

            {/* Top Toolbar (Records count & Jump to page) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-xs px-1">
              <div className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                <span className="font-bold text-cyan-400">{logPagination.totalRecords}</span> Records Found, Page {logPagination.currentPage} of {logPagination.totalPages}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <span className={cn("whitespace-nowrap text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Show:</span>
                  <div className="w-[72px] sm:w-20">
                    <Select
                      value={logPagination.limit}
                      onChange={(val) => {
                        const newLimit = parseInt(val);
                        fetchActivityLogs(1, newLimit);
                      }}
                      options={[
                        { value: 10, label: "10" },
                        { value: 25, label: "25" },
                        { value: 50, label: "50" },
                        { value: 100, label: "100" },
                      ]}
                      className={cn("!h-8 !py-0 !px-2.5 text-xs rounded-lg", isDark ? "!bg-[#060b14] !border-slate-800 hover:!border-slate-700 !text-white" : "!bg-white !border-slate-200 !text-slate-900")}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={cn("whitespace-nowrap text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Jump to Page:</span>
                  <div className="w-[72px] sm:w-20">
                    <Select
                      value={parseInt(jumpToLogPage) || 1}
                      onChange={(val) => {
                        setJumpToLogPage(String(val));
                        fetchActivityLogs(parseInt(val));
                      }}
                      options={Array.from({ length: logPagination.totalPages }, (_, i) => ({
                        value: i + 1,
                        label: String(i + 1)
                      }))}
                      className={cn("!h-8 !py-0 !px-2.5 text-xs rounded-lg", isDark ? "!bg-[#060b14] !border-slate-800 hover:!border-slate-700 !text-white" : "!bg-white !border-slate-200 !text-slate-900")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchActivityLogs(parseInt(jumpToLogPage))}
                    className="h-8 px-3.5 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>

            {/* WHMCS Table Container */}
            <div className={cn("rounded-2xl border overflow-hidden shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={cn("text-xs uppercase tracking-wider font-semibold border-b", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
                      <th className="py-3.5 px-4 font-semibold w-44 whitespace-nowrap">Date</th>
                      <th className="py-3.5 px-4 font-semibold">Description</th>
                      <th className="py-3.5 px-3 font-semibold w-28 text-center whitespace-nowrap">Username</th>
                      <th className="py-3.5 px-3 font-semibold w-36 text-center whitespace-nowrap">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", isDark ? "divide-slate-800/60" : "divide-slate-200")}>
                    {loadingLogs ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                            <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>Loading activity logs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <p className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                            No activity logs found for this client matching your filter.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log, idx) => (
                        <tr
                          key={log.id || idx}
                          className={cn(
                            "transition-colors",
                            idx % 2 === 1 ? (isDark ? "bg-[#060b14]/50" : "bg-slate-50/70") : "",
                            isDark ? "hover:bg-slate-800/40 text-zinc-300" : "hover:bg-slate-100/70 text-slate-800"
                          )}
                        >
                          <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-zinc-400">
                            {formatEmailDate(log.createdAt)}
                          </td>
                          <td className="py-2.5 px-4 leading-relaxed font-normal">
                            {formatLogDescription(log.description)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              log.username === "System" 
                                ? (isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border border-cyan-200")
                                : (isDark ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-purple-50 text-purple-700 border border-purple-200")
                            )}>
                              {log.username || "System"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-[11px] text-zinc-400">
                            {log.ipAddress || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination */}
              {logPagination.totalPages > 1 && (
                <div className={cn("p-4 border-t flex flex-wrap items-center justify-center gap-2", isDark ? "border-slate-800/80 bg-[#060b14]/50" : "border-slate-200 bg-slate-50")}>
                  <button
                    type="button"
                    disabled={logPagination.currentPage === 1}
                    onClick={() => fetchActivityLogs(Math.max(1, logPagination.currentPage - 1))}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs",
                      isDark ? "bg-[#0b1322] border-slate-700 text-zinc-300 hover:bg-white/5" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    « Previous Page
                  </button>
                  
                  {Array.from({ length: logPagination.totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === logPagination.totalPages || Math.abs(p - logPagination.currentPage) <= 2)
                    .map((p, i, arr) => {
                      const prev = arr[i - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <div key={p} className="flex items-center gap-1">
                          {showEllipsis && <span className="px-1 text-zinc-500 text-xs">...</span>}
                          <button
                            type="button"
                            onClick={() => fetchActivityLogs(p)}
                            className={cn(
                              "w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center",
                              logPagination.currentPage === p
                                ? "bg-cyan-500 text-slate-950 shadow-xs"
                                : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    type="button"
                    disabled={logPagination.currentPage >= logPagination.totalPages}
                    onClick={() => fetchActivityLogs(Math.min(logPagination.totalPages, logPagination.currentPage + 1))}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs",
                      isDark ? "bg-[#0b1322] border-slate-700 text-zinc-300 hover:bg-white/5" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    Next Page »
                  </button>
                </div>
              )}
            </div>
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
          <div className={cn("border rounded-2xl w-full max-w-md overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800 shadow-2xl" : "bg-white border-slate-200 shadow-2xl")}>
            <div className={cn("p-5 border-b flex justify-between items-center", isDark ? "border-slate-800" : "border-slate-200")}>
              <h3 className={cn("font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Suspend {suspendTarget.label}
              </h3>
              <button onClick={() => setSuspendModalOpen(false)} className={cn("transition-colors", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Reason for suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Overdue payment, Terms violation..."
                className={cn("w-full border rounded-xl p-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all min-h-[100px]", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
              />
            </div>
            <div className={cn("p-4 border-t flex justify-end gap-3", isDark ? "bg-[#0b1322] border-slate-800" : "bg-slate-50 border-slate-200")}>
              <button 
                onClick={() => setSuspendModalOpen(false)}
                disabled={isSuspending}
                className={cn("px-4 py-2.5 rounded-lg border font-medium text-sm transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
              >
                Cancel
              </button>
              <button 
                onClick={() => executeSuspend(suspendTarget.serviceType, suspendTarget.id, true, suspendReason, suspendTarget.label)}
                disabled={isSuspending || !suspendReason.trim()}
                className="px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
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
            {(!terminateTarget || !['vps', 'kubernetes', 'subscriptions'].includes(terminateTarget.serviceType)) && (
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

      {/* Delete Email Log Modal */}
      <ConfirmModal
        isOpen={deleteEmailId !== null}
        onClose={() => setDeleteEmailId(null)}
        onConfirm={handleDeleteEmailLog}
        title="Delete Email Log"
        description="Are you sure you want to delete this email message record? This action cannot be undone."
        confirmText="Delete Log"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingEmail}
      />

      {/* Viewing Email Message Modal (matching WHMCS Image 3) */}
      {viewingEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("w-full max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            {/* Header */}
            <div className={cn("px-6 py-3.5 border-b flex items-center justify-between", isDark ? "bg-[#0c1f38] border-slate-800" : "bg-[#0284c7] text-white border-sky-600")}>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Viewing Email Message
              </h3>
              <button
                type="button"
                onClick={() => setViewingEmail(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Email Metadata Details */}
            <div className={cn("px-6 py-4 border-b text-xs space-y-1.5", isDark ? "bg-[#060b14] border-slate-800 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className={isDark ? "text-white" : "text-slate-900"}>{viewingEmail.subject}</span>
              </div>
              <div className="text-xs">
                <span className="font-semibold text-zinc-500">To:</span> {viewingEmail.to}
              </div>
              <div className="text-xs text-zinc-500 font-mono">
                <span className="font-semibold">Date:</span> {formatEmailDate(viewingEmail.createdAt)}
              </div>
            </div>

            {/* Email Body Iframe with Universal Sharp Typography */}
            <div className={cn("flex-1 p-3 sm:p-4 overflow-hidden flex flex-col min-h-[380px]", isDark ? "bg-[#080d1a]" : "bg-slate-100")}>
              <iframe
                title="Email Message Preview"
                srcDoc={formatEmailPreviewHtml(viewingEmail.body)}
                sandbox="allow-same-origin allow-popups"
                className={cn("w-full flex-1 rounded-xl border shadow-inner min-h-[440px]", isDark ? "bg-[#030712] border-slate-800" : "bg-white border-slate-300")}
              />
            </div>

            {/* Footer */}
            <div className={cn("px-6 py-3.5 border-t flex justify-end gap-3", isDark ? "bg-[#0b1322] border-slate-800" : "bg-slate-50 border-slate-200")}>
              <button
                type="button"
                onClick={() => setViewingEmail(null)}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs",
                  isDark ? "border-slate-700 text-zinc-300 hover:bg-white/5" : "border-slate-300 text-slate-700 hover:bg-white"
                )}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
