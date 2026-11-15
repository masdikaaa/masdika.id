'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/billing';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  ChevronLeft,
  Cloud,
  Database,
  KeyRound,
  Settings,
  Plus,
  Trash2,
  UploadCloud,
  Folder,
  FolderPlus,
  File,
  Globe,
  Lock,
  Copy,
  Link2,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Check,
  RefreshCw,
  Search,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Server,
  Rocket,
  Edit2,
  LayoutGrid,
  List as ListIcon,
  X,
  FileCheck2,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Archive,
  Ban,
  MessageSquareQuote,
  Star,
  Clock,
  HardDrive,
} from 'lucide-react';

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  isDark,
  className,
}: {
  value: T;
  onChange: (val: T) => void;
  options: SelectOption<T>[];
  isDark: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold border transition-colors cursor-pointer focus:outline-none focus-visible:outline-none',
          isDark
            ? 'bg-[#0a0a0c] border-white/[0.08] text-white hover:border-cyan-500/40'
            : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-cyan-400'
        )}
      >
        <span className="truncate">{current?.label || value}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180', isDark ? 'text-zinc-400' : 'text-slate-500')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 right-0 mt-1.5 z-40 rounded-xl border p-1 shadow-xl max-h-60 overflow-y-auto',
            isDark ? 'bg-[#121216] border-white/[0.1]' : 'bg-white border-slate-200'
          )}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer',
                  isSelected
                    ? isDark
                      ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                      : 'bg-cyan-50 text-cyan-800 font-semibold'
                    : isDark
                      ? 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-cyan-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function FileCdnConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<any>(null);
  const [publicEndpoint, setPublicEndpoint] = useState('');
  const [tab, setTab] = useState<'files' | 'api' | 'reviews' | 'allowed' | 'settings'>('files');
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Files & Folders state
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [currentFolder, setCurrentFolder] = useState('/');
  const [media, setMedia] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Upload & Folder modals
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadVisibility, setUploadVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [uploadExpiry, setUploadExpiry] = useState<'permanent' | '3600' | '86400' | '604800' | '2592000'>('permanent');
  const [dragOver, setDragOver] = useState(false);

  // Reviews & Ratings monitoring state
  const [reviewsData, setReviewsData] = useState<{
    comments: any[];
    ratings: any[];
    stats: { totalComments: number; totalRatings: number; averageRating: number; totalMediaReviewed: number };
  }>({
    comments: [],
    ratings: [],
    stats: { totalComments: 0, totalRatings: 0, averageRating: 0, totalMediaReviewed: 0 },
  });
  const [loadingReviews, setLoadingReviews] = useState(false);

  // In-place Upgrade Plan Modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [clusterCapacity, setClusterCapacity] = useState<{ available: boolean; freeGb: number; reason?: string } | null>(null);
  const [selectedUpgradePlanId, setSelectedUpgradePlanId] = useState<number | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Rename media modal
  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string } | null>(null);
  const [renaming, setRenaming] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState<'READ_WRITE' | 'READ_ONLY'>('READ_WRITE');
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  // Settings state
  const [editName, setEditName] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [terminating, setTerminating] = useState(false);

  // Confirm modal
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const jumpToTab = (nextTab: 'files' | 'api' | 'reviews' | 'allowed' | 'settings') => {
    setTab(nextTab);
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const fetchService = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/user/cdn/services/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'File CDN service not found');
      setService(data.service);
      setPublicEndpoint(data.publicEndpoint || '');
      setApiKeys(data.service.apiKeys || []);
      if (!silent) setEditName(data.service.name);
      if (!selectedBucket && data.service.buckets?.length > 0) {
        setSelectedBucket(data.service.buckets[0].name);
      }
    } catch (err: any) {
      if (!silent) toast.error(err?.message || 'Failed to load File CDN console');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMedia = async (bucketName = selectedBucket, folder = currentFolder) => {
    if (!bucketName) return;
    setLoadingMedia(true);
    try {
      const res = await fetch(
        `/api/user/cdn?subscriptionId=${id}&bucket=${encodeURIComponent(bucketName)}&folder=${encodeURIComponent(folder)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load files');
      setMedia(data.data || data.media || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load CDN files');
    } finally {
      setLoadingMedia(false);
    }
  };

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/user/cdn/reviews?subscriptionId=${id}`);
      const data = await res.json();
      if (res.ok) {
        setReviewsData({
          comments: data.comments || [],
          ratings: data.ratings || [],
          stats: data.stats || { totalComments: 0, totalRatings: 0, averageRating: 0, totalMediaReviewed: 0 },
        });
      }
    } catch {
      // silent
    } finally {
      setLoadingReviews(false);
    }
  };

  const openUpgradeModal = async () => {
    setUpgradeModalOpen(true);
    setSelectedUpgradePlanId(service?.planId || null);
    try {
      const res = await fetch('/api/user/cdn/services');
      const data = await res.json();
      if (res.ok) {
        setAvailablePlans(data.plans || []);
        setClusterCapacity(data.capacity || null);
      }
    } catch {
      toast.error('Failed to load File CDN plans');
    }
  };

  const handleUpgradePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpgradePlanId) return;
    setUpgradingPlan(true);
    try {
      const res = await fetch(`/api/user/cdn/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedUpgradePlanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upgrade File CDN plan');
      toast.success(`Upgraded to ${data.planName || 'new plan'} without losing any data!`);
      setUpgradeModalOpen(false);
      fetchService();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upgrade plan');
    } finally {
      setUpgradingPlan(false);
    }
  };

  const handleDeleteReviewItem = (type: 'comment' | 'rating', itemId: number) => {
    setConfirmState({
      title: type === 'comment' ? 'Delete Comment' : 'Delete Rating',
      message: `Remove this ${type} from your File CDN review log?`,
      confirmText: 'Delete',
      onConfirm: async () => {
        const res = await fetch(`/api/user/cdn/reviews?${type === 'comment' ? 'commentId' : 'ratingId'}=${itemId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete');
        toast.success(`${type === 'comment' ? 'Comment' : 'Rating'} removed`);
        fetchReviews();
      },
    });
  };

  useEffect(() => {
    fetchService();
    fetchReviews();
    const timer = setInterval(() => fetchService(true), 15000);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    if (selectedBucket) {
      fetchMedia(selectedBucket, currentFolder);
    }
  }, [selectedBucket, currentFolder]);

  useEffect(() => {
    setPage(1);
  }, [selectedBucket, currentFolder, searchQuery]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!selectedBucket || files.length === 0) return;
    setUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} file(s)...`);
    const CHUNK_SIZE = 40 * 1024 * 1024; // 40MB chunks for Cloudflare / proxy compatibility
    try {
      for (const file of files) {
        const uploadToken =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
        const encodedName = btoa(encodeURIComponent(file.name));
        const encodedFolder = btoa(encodeURIComponent(currentFolder || '/'));

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const chunkBlob = file.slice(start, end);

          const res = await fetch('/api/user/cdn/upload-raw', {
            method: 'POST',
            headers: {
              'x-upload-token': uploadToken,
              'x-upload-chunk-index': chunkIndex.toString(),
              'x-upload-total-chunks': totalChunks.toString(),
              'x-upload-original-name': encodedName,
              'x-upload-mime-type': file.type || 'application/octet-stream',
              'x-upload-file-size': file.size.toString(),
              'x-upload-folder-path': encodedFolder,
              'x-upload-is-public': uploadVisibility === 'PUBLIC' ? 'true' : 'false',
              'x-upload-expires-in': uploadExpiry,
              'x-upload-bucket': selectedBucket,
              'x-upload-subscription-id': String(id),
            },
            body: chunkBlob,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || `Failed to upload ${file.name}`);
          }
        }
      }
      toast.success('Upload complete!', { id: toastId });
      fetchMedia(selectedBucket, currentFolder);
      fetchService(true);
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) await uploadFiles(files);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (service?.status === 'SUSPENDED') return;
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) await uploadFiles(files);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedBucket) return;
    setCreatingFolder(true);
    try {
      const res = await fetch('/api/user/cdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mkdir',
          subscriptionId: Number(id),
          bucket: selectedBucket,
          currentFolder,
          folderName: newFolderName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');
      toast.success('Folder created');
      setNewFolderName('');
      setShowCreateFolder(false);
      fetchMedia(selectedBucket, currentFolder);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleToggleVisibility = async (item: any) => {
    try {
      const nextStatus = item.isPublic === false;
      const res = await fetch('/api/user/cdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleVisibility', id: item.id, isPublic: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(nextStatus ? 'File is now Public' : 'File is now Private');
      setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, isPublic: nextStatus } : m)));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update visibility');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameTarget.name.trim()) return;
    setRenaming(true);
    try {
      const res = await fetch('/api/user/cdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', id: renameTarget.id, newName: renameTarget.name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed');
      toast.success('Renamed successfully');
      setRenameTarget(null);
      fetchMedia(selectedBucket, currentFolder);
    } catch (err: any) {
      toast.error(err?.message || 'Rename failed');
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteMedia = (item: any) => {
    setConfirmState({
      title: item.isFolder ? 'Delete Folder' : 'Delete File',
      message: `Permanently delete "${item.originalName}"? This action cannot be undone.`,
      confirmText: item.isFolder ? 'Delete Folder' : 'Delete File',
      onConfirm: async () => {
        const res = await fetch(`/api/user/cdn?id=${item.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Delete failed');
        toast.success('Deleted successfully');
        fetchMedia(selectedBucket, currentFolder);
        fetchService(true);
      },
    });
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch('/api/user/cdn/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scope: newKeyScope,
          subscriptionId: Number(id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate key');
      setRevealedKey(data.rawKey);
      setNewKeyName('');
      toast.success('CDN API Key generated!');
      fetchService(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteApiKey = (keyId: number) => {
    setConfirmState({
      title: 'Revoke CDN API Key',
      message: 'Revoke this API key? Applications using it will lose access immediately.',
      confirmText: 'Revoke Key',
      onConfirm: async () => {
        const res = await fetch(`/api/user/cdn/keys?id=${keyId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to revoke key');
        toast.success('API Key revoked');
        fetchService(true);
      },
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/user/cdn/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      toast.success('Service name updated');
      fetchService(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTerminate = () => {
    setConfirmState({
      title: 'Terminate File CDN Service',
      message: `Permanently terminate "${service?.name}"? All files, folders, and API keys for this instance will be deleted.`,
      confirmText: 'Terminate Service',
      onConfirm: async () => {
        setTerminating(true);
        try {
          const res = await fetch(`/api/user/cdn/services/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Termination failed');
          toast.success('File CDN service terminated');
          router.push('/dashboard/cdn');
        } finally {
          setTerminating(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>
          Loading File CDN details...
        </p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-slate-600')}>File CDN instance not found.</p>
        <Link href="/dashboard/cdn" className={cn('text-xs font-bold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
          Back to File CDN
        </Link>
      </div>
    );
  }

  const rawPct = service.limitBytes > 0 ? Math.min(100, (service.usedBytes / service.limitBytes) * 100) : 0;
  const usedPercentLabel =
    rawPct === 0 ? '0%' : rawPct < 0.01 ? '< 0.01%' : rawPct < 1 ? `${rawPct.toFixed(2)}%` : `${Math.round(rawPct)}%`;
  const primaryBucket = service.buckets?.[0]?.name || `masdika-cdn-u-s${service.id}`;
  const isSuspended = service.status === 'SUSPENDED';

  const filteredMedia = media.filter((m) =>
    (m.originalName || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredMedia.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedMedia = filteredMedia.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const breadcrumbs = () => {
    const parts = currentFolder.split('/').filter(Boolean);
    const list = [{ name: 'Home', path: '/' }];
    let acc = '';
    parts.forEach((p) => {
      acc += '/' + p;
      list.push({ name: p, path: acc });
    });
    return list;
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Back Button */}
      <div>
        <Link
          href="/dashboard/cdn"
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            isDark ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to File CDN
        </Link>
      </div>

      {/* Hero Header Card (Matching Managed Apps) */}
      <div
        className={cn(
          'border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-2xs',
          isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90'
        )}
      >
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div
            className={cn(
              'w-12 h-12 rounded-xl border flex items-center justify-center shrink-0',
              isDark
                ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400 shadow-sm shadow-cyan-500/10'
                : 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-2xs'
            )}
          >
            <Cloud className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={cn('text-lg sm:text-xl font-bold tracking-tight truncate', isDark ? 'text-white' : 'text-slate-900')}>
                {service.name}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap',
                  isSuspended
                    ? isDark
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                    : isDark
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isSuspended ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse')} />
                {isSuspended ? 'SUSPENDED (3-Day Grace)' : service.status}
              </span>
            </div>

            <div className={cn('flex items-center gap-2 flex-wrap text-xs font-medium mt-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              <span>{service.planName}</span>
              <span className="opacity-30">•</span>
              <span>Region: Sidoarjo</span>
              <span className="opacity-30">•</span>
              <button
                type="button"
                onClick={() => handleCopy(primaryBucket, 'CDN Space ID')}
                className={cn(
                  'font-mono px-2 py-0.5 rounded-md text-[11px] font-semibold truncate max-w-[220px] sm:max-w-none transition-colors border cursor-pointer',
                  isDark ? 'text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border-cyan-500/20' : 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200'
                )}
                title="Click to copy CDN space ID"
              >
                {primaryBucket}
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto pt-3 md:pt-0 shrink-0">
          <button
            type="button"
            onClick={openUpgradeModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Upgrade Plan</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => jumpToTab('api')}
              className={cn(
                'flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border whitespace-nowrap',
                isDark ? 'bg-white/[0.05] text-zinc-300 hover:bg-white/10 border-white/10' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              )}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>API Keys</span>
            </button>

            <button
              type="button"
              onClick={() => jumpToTab('settings')}
              className={cn(
                'flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border whitespace-nowrap',
                isDark ? 'bg-white/[0.05] text-zinc-300 hover:bg-white/10 border-white/10' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              )}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={handleTerminate}
              disabled={terminating}
              className={cn(
                'py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border disabled:opacity-40',
                isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
              )}
              title="Terminate File CDN"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2-Row Aligned Bento Grid (Matching Managed Apps) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Row 1 Left: CDN Delivery & Endpoint */}
        <div
          className={cn(
            'lg:col-span-7 lg:order-1 h-full flex flex-col justify-between border rounded-2xl p-5 sm:p-6 space-y-5 transition-all shadow-2xs',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h3 className={cn('text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
              <Globe className="w-4 h-4 shrink-0" />
              <span>CDN Delivery &amp; Edge Routing</span>
            </h3>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold self-start sm:self-auto shrink-0 border',
                isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AES-256 Encrypted</span>
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className={cn('text-[11px] font-semibold uppercase tracking-wider block mb-1', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                CDN Space ID
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex-1 px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold truncate',
                    isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-400' : 'bg-slate-50 border-slate-200/90 text-cyan-800 shadow-2xs'
                  )}
                >
                  {primaryBucket}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(primaryBucket, 'CDN Space ID')}
                  className={cn('p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0', isDark ? 'border-white/10 hover:bg-white/5 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700')}
                  title="Copy CDN Space ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => jumpToTab('api')}
                  className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>REST API</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className={cn('p-3 rounded-xl border space-y-1', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider block', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                  Storage Backend
                </span>
                <span className={cn('text-xs font-bold block', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
                  {publicEndpoint ? publicEndpoint.replace(/^https?:\/\//, '') : 'Edge Storage Cluster'}
                </span>
              </div>
              <div className={cn('p-3 rounded-xl border space-y-1', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider block', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                  Delivery Security
                </span>
                <span className={cn('text-xs font-bold block', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                  TLS 1.3 • Public &amp; Private ACLs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 1 Right: Storage Telemetry */}
        <div
          className={cn(
            'lg:col-span-5 lg:order-2 h-full flex flex-col justify-between border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className={cn('text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
              <Activity className="w-4 h-4 shrink-0" />
              <span>Storage Telemetry</span>
            </h3>
            <span className={cn('text-[11px] font-mono self-start sm:self-auto', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              Live CDN Quota
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className={cn('flex items-center justify-between pb-2 border-b', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Service Status:</span>
              <span className={cn('font-bold flex items-center gap-1.5', isSuspended ? (isDark ? 'text-amber-400' : 'text-amber-700') : (isDark ? 'text-emerald-400' : 'text-emerald-700'))}>
                <span className={cn('w-2 h-2 rounded-full', isSuspended ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse')} />
                {isSuspended ? 'Suspended (Grace)' : 'Active (Ready)'}
              </span>
            </div>

            <div className={cn('pb-2.5 border-b space-y-1.5', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
              <div className="flex items-center justify-between">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Storage Used:</span>
                <span className={cn('font-mono font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                  {formatBytes(service.usedBytes || 0)} / {service.limitGB > 0 ? `${service.limitGB} GB (${usedPercentLabel})` : 'Unlimited'}
                </span>
              </div>
              <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/[0.06]' : 'bg-slate-200')}>
                <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${rawPct}%` }} />
              </div>
            </div>

            <div className={cn('flex items-center justify-between pb-2 border-b', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Stored Items:</span>
              <span className={cn('font-mono font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{media.length} Items</span>
            </div>

            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>REST API Keys:</span>
              <span className={cn('font-mono font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-700')}>{apiKeys.length} Keys</span>
            </div>
          </div>
        </div>

        {/* Row 2 Left: REST API Quick Access */}
        <div
          className={cn(
            'lg:col-span-7 lg:order-3 h-full flex flex-col border rounded-2xl p-5 sm:p-6 space-y-3.5 transition-all shadow-2xs',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className={cn('text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>REST API Quick Upload</span>
            </h3>
            <button
              type="button"
              onClick={() => jumpToTab('api')}
              className={cn('text-xs font-bold hover:underline cursor-pointer self-start sm:self-auto', isDark ? 'text-cyan-400' : 'text-cyan-700')}
            >
              Manage API Keys →
            </button>
          </div>

          <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Upload files programmatically to this File CDN instance using any scoped REST API key.
          </p>

          {/* macOS Terminal Window */}
          <div className={cn('rounded-xl border overflow-hidden', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
            <div className={cn('px-3.5 py-2 border-b flex items-center justify-between gap-2', isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-100/90 border-slate-200')}>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/85" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/85" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85" />
                <span className={cn('ml-2 text-[10px] font-mono font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                  bash — cdn-upload
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/upload" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -F "file=@./image.png" -F "isPublic=true"`,
                    'cURL command'
                  )
                }
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer',
                  isDark ? 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                )}
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className={cn('p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto', isDark ? 'text-cyan-300' : 'text-slate-800')}>
{`curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/upload" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@./image.png" -F "isPublic=true"`}
            </pre>
          </div>
        </div>

        {/* Row 2 Right: Allocated Plan & Billing */}
        <div
          className={cn(
            'lg:col-span-5 lg:order-4 h-full flex flex-col justify-between border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90'
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className={cn('text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
              <Server className="w-4 h-4 shrink-0" />
              <span>Allocated Plan</span>
            </h3>
            <button
              type="button"
              onClick={openUpgradeModal}
              className={cn('text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer', isDark ? 'text-cyan-400' : 'text-cyan-700')}
            >
              <span>Upgrade</span>
              <Rocket className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className={cn('flex items-center justify-between pb-2 border-b', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Plan Tier:</span>
              <span className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{service.planName}</span>
            </div>
            <div className={cn('flex items-center justify-between pb-2 border-b', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Storage Quota:</span>
              <span className={cn('font-mono font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                {service.limitGB > 0 ? `${service.limitGB} GB Edge CDN` : 'Unlimited'}
              </span>
            </div>
            <div className={cn('flex items-center justify-between pb-2 border-b', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Hourly Rate:</span>
              <span className={cn('font-mono font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                Rp {(service.hourlyRate || 0).toLocaleString('id-ID')}/hour
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Monthly Billing:</span>
              <span className={cn('font-mono font-bold text-sm', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
                Rp {(service.monthlyPrice || 0).toLocaleString('id-ID')}/month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Outlined Cyan Segmented Tabs + Summary Bar */}
      <div ref={workspaceRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className={cn(
            'flex items-center gap-1 p-1 rounded-2xl border overflow-x-auto max-w-full sm:w-fit [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          )}
        >
          {[
            { id: 'files', label: 'Files & Folders', icon: Folder, count: media.length },
            { id: 'api', label: 'REST API & Keys', icon: KeyRound, count: apiKeys.length },
            { id: 'reviews', label: 'Reviews & Ratings', icon: MessageSquareQuote, count: reviewsData.stats.totalComments + reviewsData.stats.totalRatings },
            { id: 'allowed', label: 'Allowed Files', icon: FileCheck2 },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as any)}
                className={cn(
                  'px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 border focus:outline-none focus-visible:outline-none',
                  active
                    ? isDark
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-white shadow-sm'
                      : 'bg-white border-cyan-300 text-slate-900 shadow-xs'
                    : isDark
                      ? 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/70'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5 shrink-0', active && (isDark ? 'text-cyan-400' : 'text-cyan-600'))} />
                <span>{t.label}</span>
                {typeof t.count === 'number' && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold leading-none',
                      active
                        ? isDark
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-cyan-50 text-cyan-700'
                        : isDark
                          ? 'bg-white/[0.06] text-zinc-400'
                          : 'bg-slate-200/80 text-slate-600'
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2.5">
          <span className={cn('px-3 py-1.5 rounded-xl border text-[11px] font-medium', isDark ? 'bg-[#111115] border-white/[0.08] text-zinc-400' : 'bg-white border-slate-200 text-slate-600 shadow-2xs')}>
            {media.length} Items • {apiKeys.length} API Keys
          </span>
          <button
            type="button"
            onClick={() => fetchService(true)}
            className={cn('px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer', isDark ? 'bg-[#111115] border-white/[0.08] text-zinc-300 hover:bg-white/[0.05]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Files & Folders */}
      {tab === 'files' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'rounded-2xl border p-5 space-y-4 transition-colors',
            dragOver
              ? 'border-cyan-400 bg-cyan-500/[0.06]'
              : isDark
                ? 'bg-[#111115] border-white/[0.08]'
                : 'bg-white border-slate-200/90 shadow-2xs'
          )}
        >
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className={cn('flex items-center gap-1 text-xs font-mono px-3 py-2 rounded-xl border flex-wrap max-w-full', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                {breadcrumbs().map((c, idx) => (
                  <span key={c.path} className="flex items-center gap-1">
                    {idx > 0 && <ChevronRight className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-slate-400')} />}
                    <button
                      type="button"
                      onClick={() => setCurrentFolder(c.path)}
                      className={cn('font-semibold hover:underline cursor-pointer', idx === breadcrumbs().length - 1 ? (isDark ? 'text-cyan-400' : 'text-cyan-700') : (isDark ? 'text-zinc-400' : 'text-slate-600'))}
                    >
                      {c.name}
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-48">
                <Search className={cn('w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-zinc-500' : 'text-slate-400')} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className={cn('w-full rounded-xl pl-8 pr-3 py-2 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400')}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <CustomSelect
                  value={uploadVisibility}
                  onChange={setUploadVisibility}
                  isDark={isDark}
                  className="w-28 shrink-0"
                  options={[
                    { value: 'PUBLIC', label: 'Public' },
                    { value: 'PRIVATE', label: 'Private' },
                  ]}
                />

                <CustomSelect
                  value={uploadExpiry}
                  onChange={setUploadExpiry}
                  isDark={isDark}
                  className="w-36 shrink-0"
                  options={[
                    { value: 'permanent', label: 'Permanent' },
                    { value: '3600', label: 'Temp: 1 Hour' },
                    { value: '86400', label: 'Temp: 24 Hours' },
                    { value: '604800', label: 'Temp: 7 Days' },
                    { value: '2592000', label: 'Temp: 30 Days' },
                  ]}
                />

              <div className={cn('hidden sm:flex border rounded-xl p-0.5 shrink-0', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                <button type="button" onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-lg cursor-pointer', viewMode === 'list' ? (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white text-cyan-700 shadow-2xs') : 'text-zinc-500')}>
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-lg cursor-pointer', viewMode === 'grid' ? (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white text-cyan-700 shadow-2xs') : 'text-zinc-500')}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateFolder(true)}
                disabled={isSuspended}
                className={cn('px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-200 hover:bg-white/[0.05]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100')}
              >
                <FolderPlus className="w-3.5 h-3.5" /> New Folder
              </button>

              <input type="file" multiple ref={fileInputRef} onChange={handleFileInput} className="hidden" disabled={isSuspended} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSuspended || uploading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
              </button>
              </div>
            </div>
          </div>

          {/* Files List */}
          {loadingMedia ? (
            <div className="min-h-[240px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : paginatedMedia.length === 0 ? (
            <div className={cn('min-h-[240px] flex flex-col items-center justify-center px-6 rounded-2xl border border-dashed text-center space-y-3', isDark ? 'border-white/[0.1] bg-[#0a0a0c]/50' : 'border-slate-300 bg-slate-50/70')}>
              <div className={cn('w-10 h-10 rounded-xl mx-auto flex items-center justify-center border', isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-600')}>
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                  {searchQuery ? 'No matching files found' : 'This folder is empty'}
                </p>
                <p className={cn('text-[11px] mt-1', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                  Drag &amp; drop files here, click Upload Files, or use the REST API.
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-[240px] flex flex-col justify-between gap-3">
              {viewMode === 'list' ? (
                <div className={cn('divide-y border rounded-xl overflow-hidden', isDark ? 'divide-white/[0.06] border-white/[0.06] bg-[#0a0a0c]' : 'divide-slate-200 border-slate-200 bg-white')}>
                  {paginatedMedia.map((item) => {
                    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/media/${item.token}`;
                    return (
                      <div key={item.id} className={cn('p-3 flex items-center justify-between gap-3 text-xs', isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50')}>
                        <div
                          className={cn('flex items-center gap-2.5 min-w-0', item.isFolder && 'cursor-pointer')}
                          onClick={() => {
                            if (item.isFolder) {
                              setCurrentFolder(`${currentFolder === '/' ? '' : currentFolder}/${item.originalName}`);
                            }
                          }}
                        >
                          {item.isFolder ? (
                            <Folder className={cn('w-4 h-4 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                          ) : (
                            <File className={cn('w-4 h-4 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                          )}
                          <span className={cn('truncate font-medium', isDark ? 'text-zinc-200' : 'text-slate-800')}>{item.originalName}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!item.isFolder && (
                            <>
                              <span className={cn('font-mono text-[11px] hidden sm:inline', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                                {formatBytes(Number(item.size || 0))}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleVisibility(item)}
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 cursor-pointer',
                                  item.isPublic !== false
                                    ? isDark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : isDark ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                                )}
                              >
                                {item.isPublic !== false ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {item.isPublic !== false ? 'PUBLIC' : 'PRIVATE'}
                              </button>
                              {item.expiresAt && (
                                <span
                                  title={`Expires at ${new Date(item.expiresAt).toLocaleString()}`}
                                  className={cn(
                                    'hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                                    isDark ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                                  )}
                                >
                                  <Clock className="w-3 h-3" />
                                  Temp • {new Date(item.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(shareUrl, 'CDN Link')}
                                title="Copy CDN Share Link"
                                className={cn('p-1.5 rounded-lg cursor-pointer', isDark ? 'text-cyan-400 hover:bg-white/[0.05]' : 'text-cyan-600 hover:bg-cyan-50')}
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setRenameTarget({ id: item.id, name: item.originalName })}
                            title="Rename"
                            className={cn('p-1.5 rounded-lg cursor-pointer', isDark ? 'text-zinc-400 hover:text-white hover:bg-white/[0.05]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(item)}
                            title="Delete"
                            className={cn('p-1.5 rounded-lg cursor-pointer', isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginatedMedia.map((item) => {
                    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/media/${item.token}`;
                    return (
                      <div key={item.id} className={cn('p-3.5 rounded-xl border flex flex-col justify-between gap-3 text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                        <div
                          className={cn('flex items-center gap-2.5 min-w-0', item.isFolder && 'cursor-pointer')}
                          onClick={() => {
                            if (item.isFolder) {
                              setCurrentFolder(`${currentFolder === '/' ? '' : currentFolder}/${item.originalName}`);
                            }
                          }}
                        >
                          {item.isFolder ? (
                            <Folder className={cn('w-5 h-5 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                          ) : (
                            <File className={cn('w-5 h-5 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                          )}
                          <div className="min-w-0">
                            <p className={cn('font-semibold truncate', isDark ? 'text-white' : 'text-slate-900')}>{item.originalName}</p>
                            {!item.isFolder && <p className={cn('text-[10px] font-mono', isDark ? 'text-zinc-500' : 'text-slate-500')}>{formatBytes(Number(item.size || 0))}</p>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                          {!item.isFolder ? (
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(item)}
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 cursor-pointer',
                                item.isPublic !== false
                                  ? isDark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : isDark ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                              )}
                            >
                              {item.isPublic !== false ? 'PUBLIC' : 'PRIVATE'}
                            </button>
                          ) : (
                            <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>Folder</span>
                          )}
                          <div className="flex items-center gap-1">
                            {!item.isFolder && (
                              <button type="button" onClick={() => handleCopy(shareUrl, 'CDN Link')} className={cn('p-1.5 rounded-lg cursor-pointer', isDark ? 'text-cyan-400 hover:bg-white/[0.05]' : 'text-cyan-600 hover:bg-cyan-50')}>
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button type="button" onClick={() => handleDeleteMedia(item)} className={cn('p-1.5 rounded-lg cursor-pointer', isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50')}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
                <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>
                  Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredMedia.length)} of {filteredMedia.length} items
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className={cn('px-2.5 py-1 rounded-lg border font-semibold cursor-pointer disabled:opacity-40', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300' : 'bg-white border-slate-200 text-slate-700')}
                    >
                      Prev
                    </button>
                    <span className={cn('px-2 font-mono font-semibold', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                      Page {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className={cn('px-2.5 py-1 rounded-lg border font-semibold cursor-pointer disabled:opacity-40', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300' : 'bg-white border-slate-200 text-slate-700')}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: REST API & Keys (100% Cyan Theme + CustomSelect) */}
      {tab === 'api' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className={cn('lg:col-span-6 rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>File CDN REST API Keys</h2>
              </div>
              <span className={cn('text-[11px] font-mono', isDark ? 'text-zinc-400' : 'text-slate-500')}>{apiKeys.length} keys</span>
            </div>

            {revealedKey && (
              <div className={cn('p-3.5 rounded-xl border text-xs space-y-2', isDark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
                <div className="flex items-center justify-between">
                  <p className="font-bold">New API Key Created (copy now — shown once):</p>
                  <button type="button" onClick={() => setRevealedKey(null)} className="cursor-pointer opacity-75 hover:opacity-100">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className={cn('flex-1 px-3 py-1.5 rounded-lg font-mono break-all', isDark ? 'bg-black/40' : 'bg-white border border-emerald-200')}>{revealedKey}</code>
                  <button type="button" onClick={() => handleCopy(revealedKey, 'API Key')} className="px-2.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold cursor-pointer">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateApiKey} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key label (e.g. CI/CD Uploader)"
                className={cn('flex-1 rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400')}
              />
              <CustomSelect
                value={newKeyScope}
                onChange={setNewKeyScope}
                isDark={isDark}
                className="w-full sm:w-36 shrink-0"
                options={[
                  { value: 'READ_WRITE', label: 'Read & Write' },
                  { value: 'READ_ONLY', label: 'Read Only' },
                ]}
              />
              <button
                type="submit"
                disabled={creatingKey || !newKeyName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                {creatingKey ? 'Generating...' : 'Generate Key'}
              </button>
            </form>

            <div className="space-y-2">
              {apiKeys.length === 0 ? (
                <p className={cn('text-xs py-6 text-center', isDark ? 'text-zinc-500' : 'text-slate-500')}>No API keys created for this instance yet.</p>
              ) : (
                apiKeys.map((k) => (
                  <div key={k.id} className={cn('flex items-center justify-between p-3 rounded-xl border text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                    <div className="min-w-0">
                      <span className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{k.name}</span>
                      <span className={cn('ml-2 font-mono', isDark ? 'text-zinc-400' : 'text-slate-500')}>{k.keyPrefix}...</span>
                      <span className={cn('ml-2 px-2 py-0.5 rounded text-[10px] font-semibold', isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-100 text-cyan-800')}>
                        {k.permission}
                      </span>
                    </div>
                    <button type="button" onClick={() => handleDeleteApiKey(k.id)} className={cn('p-1.5 rounded-lg cursor-pointer', isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={cn('lg:col-span-6 rounded-2xl border p-5 space-y-3', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div className="flex items-center gap-2">
              <Terminal className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
              <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Quick API Examples</h2>
            </div>
            {/* macOS Terminal Window */}
            <div className={cn('rounded-xl border overflow-hidden', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
              <div className={cn('px-3.5 py-2 border-b flex items-center justify-between gap-2', isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-100/90 border-slate-200')}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/85" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/85" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85" />
                  <span className={cn('ml-2 text-[10px] font-mono font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                    bash — api-examples
                  </span>
                </div>
              </div>
              <pre className={cn('overflow-x-auto p-3.5 font-mono text-[11px] leading-relaxed', isDark ? 'text-cyan-300' : 'text-slate-800')}>
{`# Upload file to this File CDN
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/upload" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@./image.png" \\
  -F "isPublic=true"

# List files in this File CDN
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/files"

# Download file via API
curl -L -H "Authorization: Bearer YOUR_API_KEY" \\
  "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/files/FILE_TOKEN" -o output.bin`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reviews & Ratings Monitoring */}
      {tab === 'reviews' && (
        <div className="space-y-5">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className={cn('rounded-2xl border p-4 space-y-1', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
              <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-slate-500')}>Average Rating</span>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className={cn('text-xl font-extrabold font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                  {reviewsData.stats.averageRating > 0 ? reviewsData.stats.averageRating.toFixed(1) : '—'}
                </span>
              </div>
            </div>
            <div className={cn('rounded-2xl border p-4 space-y-1', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
              <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-slate-500')}>Total Ratings</span>
              <div className={cn('text-xl font-extrabold font-mono', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
                {reviewsData.stats.totalRatings}
              </div>
            </div>
            <div className={cn('rounded-2xl border p-4 space-y-1', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
              <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-slate-500')}>Total Comments</span>
              <div className={cn('text-xl font-extrabold font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                {reviewsData.stats.totalComments}
              </div>
            </div>
            <div className={cn('rounded-2xl border p-4 space-y-1', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
              <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-slate-500')}>Files Reviewed</span>
              <div className={cn('text-xl font-extrabold font-mono', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                {reviewsData.stats.totalMediaReviewed}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Comments & Who Commented */}
            <div className={cn('lg:col-span-7 rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                  <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Comments &amp; Discussions</h2>
                </div>
                <button
                  type="button"
                  onClick={fetchReviews}
                  className={cn('text-[11px] font-semibold flex items-center gap-1 cursor-pointer', isDark ? 'text-cyan-400 hover:underline' : 'text-cyan-700 hover:underline')}
                >
                  <RefreshCw className={cn('w-3 h-3', loadingReviews && 'animate-spin')} /> Refresh
                </button>
              </div>

              {reviewsData.comments.length === 0 ? (
                <div className={cn('p-8 rounded-xl border border-dashed text-center text-xs', isDark ? 'border-white/[0.08] text-zinc-500' : 'border-slate-200 text-slate-500')}>
                  No comments yet on files in this File CDN instance.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewsData.comments.map((c: any) => (
                    <div key={c.id} className={cn('p-3.5 rounded-xl border space-y-2 text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('font-bold truncate', isDark ? 'text-white' : 'text-slate-900')}>{c.name}</span>
                              <span className={cn('text-[10px] font-mono truncate', isDark ? 'text-zinc-500' : 'text-slate-500')}>{c.email}</span>
                            </div>
                            <div className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                              on <span className={cn('font-mono font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-700')}>{c.media?.originalName || 'File'}</span> • {new Date(c.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteReviewItem('comment', c.id)}
                          title="Delete Comment"
                          className={cn('p-1.5 rounded-lg shrink-0 cursor-pointer', isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className={cn('leading-relaxed', isDark ? 'text-zinc-300' : 'text-slate-700')}>{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Star Ratings */}
            <div className={cn('lg:col-span-5 rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Recent Star Ratings</h2>
              </div>

              {reviewsData.ratings.length === 0 ? (
                <div className={cn('p-8 rounded-xl border border-dashed text-center text-xs', isDark ? 'border-white/[0.08] text-zinc-500' : 'border-slate-200 text-slate-500')}>
                  No star ratings submitted yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reviewsData.ratings.map((r: any) => (
                    <div key={r.id} className={cn('p-3 rounded-xl border flex items-center justify-between gap-2 text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" /> {r.rating}.0
                          </span>
                          <span className={cn('font-semibold truncate', isDark ? 'text-white' : 'text-slate-900')}>
                            {r.userName || r.userEmail || 'Anonymous'}
                          </span>
                        </div>
                        <p className={cn('text-[10px] truncate mt-0.5', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                          {r.media?.originalName || 'File'} • {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReviewItem('rating', r.id)}
                        title="Delete Rating"
                        className={cn('p-1.5 rounded-lg shrink-0 cursor-pointer', isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Allowed Files */}
      {tab === 'allowed' && (
        <div className="space-y-5">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={cn('rounded-2xl border p-5 space-y-2.5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
              <div className="flex items-center gap-2">
                <UploadCloud className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Upload Size Limits</h2>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Dashboard / Browser Upload:</span>
                  <span className={cn('font-mono font-bold', isDark ? 'text-cyan-400' : 'text-cyan-700')}>Up to 10 GB / file</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>REST API Single Request:</span>
                  <span className={cn('font-mono font-bold', isDark ? 'text-cyan-400' : 'text-cyan-700')}>Up to 100 MB / request</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Total Storage Quota:</span>
                  <span className={cn('font-mono font-bold', isDark ? 'text-white' : 'text-slate-900')}>{service.storageLimitGb || 10} GB Edge CDN</span>
                </div>
              </div>
            </div>

            <div className={cn('rounded-2xl border p-5 space-y-2.5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Security &amp; Validation Policy</h2>
              </div>
              <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                Every uploaded file undergoes automatic magic-byte &amp; MIME signature verification before being stored. Files with spoofed extensions or unsupported formats are automatically rejected.
              </p>
            </div>
          </div>

          {/* Supported Categories */}
          <div className={cn('rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div>
              <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Supported File Extensions</h2>
              <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                Only the extensions listed below are permitted on Masdika File CDN (both Dashboard and REST API).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Images',
                  subtitle: 'Validated & edge-cached',
                  icon: ImageIcon,
                  exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif'],
                },
                {
                  title: 'Videos',
                  subtitle: 'Streaming & media assets',
                  icon: Film,
                  exts: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'],
                },
                {
                  title: 'Audio',
                  subtitle: 'Podcasts & sound files',
                  icon: Music,
                  exts: ['mp3', 'wav', 'm4a', 'flac', 'aac'],
                },
                {
                  title: 'Documents & Data',
                  subtitle: 'Office, docs & config',
                  icon: FileText,
                  exts: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'json'],
                },
                {
                  title: 'Archives',
                  subtitle: 'Compressed bundles',
                  icon: Archive,
                  exts: ['zip', 'rar', '7z', 'gz'],
                },
              ].map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div
                    key={cat.title}
                    className={cn('p-4 rounded-xl border space-y-3', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>{cat.title}</h3>
                        <p className={cn('text-[11px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>{cat.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.exts.map((ext) => (
                        <span
                          key={ext}
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border',
                            isDark ? 'bg-white/[0.03] border-white/[0.08] text-cyan-300' : 'bg-white border-slate-200 text-cyan-700'
                          )}
                        >
                          .{ext}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Blocked Formats Notice */}
          <div className={cn('rounded-2xl border p-4 flex items-start gap-3 text-xs', isDark ? 'border-red-500/25 bg-red-500/[0.04] text-zinc-300' : 'border-red-200 bg-red-50/70 text-slate-700')}>
            <Ban className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className={cn('font-bold', isDark ? 'text-red-300' : 'text-red-800')}>Blocked &amp; Restricted Formats</p>
              <p className="leading-relaxed">
                Executable binaries, server-side scripts, and active web payloads (such as <code className="font-mono">.exe</code>, <code className="font-mono">.sh</code>, <code className="font-mono">.bat</code>, <code className="font-mono">.php</code>, <code className="font-mono">.js</code>, <code className="font-mono">.html</code>, <code className="font-mono">.svg</code>) are strictly prohibited on File CDN to prevent XSS and malware distribution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Settings */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form onSubmit={handleSaveSettings} className={cn('rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Rename File CDN Instance</h2>
            <div>
              <label className={cn('block text-xs font-semibold mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>Service Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={cn('w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
              />
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          <div className={cn('rounded-2xl border p-5 space-y-3', isDark ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-red-200 bg-red-50/70')}>
            <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Danger Zone</span>
            </div>
            <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              Terminating permanently deletes all files, folders, and REST API keys for this File CDN instance and stops hourly billing.
            </p>
            <button
              type="button"
              onClick={handleTerminate}
              disabled={terminating}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 cursor-pointer"
            >
              {terminating ? 'Terminating...' : 'Terminate File CDN'}
            </button>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateFolder} className={cn('w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl', isDark ? 'bg-[#101014] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900')}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Create New Folder</h3>
              <button type="button" onClick={() => setShowCreateFolder(false)} className="p-1.5 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <input
              type="text"
              required
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. product-images"
              className={cn('w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateFolder(false)} className={cn('px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer', isDark ? 'border-white/[0.08] text-zinc-300' : 'border-slate-200 text-slate-700')}>Cancel</button>
              <button type="submit" disabled={creatingFolder} className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer">
                {creatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRenameSubmit} className={cn('w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl', isDark ? 'bg-[#101014] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900')}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Rename Item</h3>
              <button type="button" onClick={() => setRenameTarget(null)} className="p-1.5 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <input
              type="text"
              required
              autoFocus
              value={renameTarget.name}
              onChange={(e) => setRenameTarget({ ...renameTarget, name: e.target.value })}
              className={cn('w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRenameTarget(null)} className={cn('px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer', isDark ? 'border-white/[0.08] text-zinc-300' : 'border-slate-200 text-slate-700')}>Cancel</button>
              <button type="submit" disabled={renaming} className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer">
                {renaming ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upgrade / Scale Plan Modal (Zero Data Loss) */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUpgradePlan}
            className={cn(
              'w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto',
              isDark ? 'bg-[#101014] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Upgrade / Scale File CDN Plan</h3>
                <p className={cn('text-[11px] mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                  Switch tiers in-place — all files, folders, share links, and API keys remain 100% intact.
                </p>
              </div>
              <button type="button" onClick={() => setUpgradeModalOpen(false)} className="p-1.5 rounded-lg opacity-70 hover:opacity-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {availablePlans.map((p: any) => {
                const isCurrent = p.id === service.planId;
                const isSelected = p.id === selectedUpgradePlanId;
                const gb = Number(p.storageGb || 0);
                const currentGb = Number(service.limitGB || 0);
                const neededGb = Math.max(0, gb - currentGb);
                const hasCap = clusterCapacity ? clusterCapacity.available && clusterCapacity.freeGb >= neededGb : true;
                const tooSmallForUsage = gb > 0 && gb * 1024 * 1024 * 1024 < Number(service.usedBytes || 0);
                const disabled = !hasCap || tooSmallForUsage;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setSelectedUpgradePlanId(p.id)}
                    className={cn(
                      'w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3',
                      disabled
                        ? isDark ? 'bg-[#0a0a0c]/60 border-white/[0.04] opacity-50 cursor-not-allowed' : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : isSelected
                          ? isDark ? 'bg-cyan-500/10 border-cyan-500/50 cursor-pointer' : 'bg-cyan-50 border-cyan-500 cursor-pointer'
                          : isDark ? 'bg-[#0a0a0c] border-white/[0.08] hover:border-white/20 cursor-pointer' : 'bg-slate-50 border-slate-200 hover:border-cyan-300 cursor-pointer'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <HardDrive className={cn('w-4 h-4 shrink-0', isSelected ? 'text-cyan-400' : 'text-zinc-400')} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{p.name}</span>
                          {isCurrent && (
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', isDark ? 'bg-white/10 text-zinc-300' : 'bg-slate-200 text-slate-700')}>
                              Current
                            </span>
                          )}
                        </div>
                        <p className={cn('text-[11px] font-mono', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                          {gb} GB SSD • {formatRupiah(p.price)}/mo ({formatRupiah(p.hourlyPrice || Math.ceil(p.price / 730))}/hr)
                        </p>
                      </div>
                    </div>
                    <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', isSelected ? 'border-cyan-400 bg-cyan-400 text-slate-950' : isDark ? 'border-zinc-600' : 'border-slate-300')}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className={cn('px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer', isDark ? 'border-white/[0.08] text-zinc-300' : 'border-slate-200 text-slate-700')}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={upgradingPlan || !selectedUpgradePlanId || selectedUpgradePlanId === service.planId}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {upgradingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                <span>{upgradingPlan ? 'Upgrading...' : 'Apply Plan Change'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Consistent Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={async () => {
          if (confirmState) {
            await confirmState.onConfirm();
          }
        }}
        title={confirmState?.title || ''}
        description={confirmState?.message || ''}
        confirmText={confirmState?.confirmText || 'Confirm'}
        variant="danger"
      />
    </div>
  );
}
