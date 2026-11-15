'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
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
  const [tab, setTab] = useState<'files' | 'buckets' | 'api' | 'settings'>('files');
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
  const [dragOver, setDragOver] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Rename media modal
  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string } | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Buckets state
  const [newBucketName, setNewBucketName] = useState('');
  const [creatingBucket, setCreatingBucket] = useState(false);

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

  const jumpToTab = (nextTab: 'files' | 'buckets' | 'api' | 'settings') => {
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
      setMedia(data.media || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load CDN files');
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    fetchService();
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
    try {
      for (const file of files) {
        const initRes = await fetch('/api/user/cdn/upload/init', { method: 'POST' });
        const initData = await initRes.json();
        if (!initRes.ok || !initData.uploadToken) {
          throw new Error(initData.error || 'Failed to initialize upload');
        }

        const chunkSize = 5 * 1024 * 1024;
        for (let offset = 0; offset < file.size; offset += chunkSize) {
          const chunk = file.slice(offset, offset + chunkSize);
          const chunkRes = await fetch('/api/user/cdn/upload/chunk', {
            method: 'POST',
            headers: {
              'x-upload-token': initData.uploadToken,
              'Content-Type': 'application/octet-stream',
            },
            body: chunk,
          });
          if (!chunkRes.ok) {
            const errData = await chunkRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to upload file chunk');
          }
        }

        const encodedName = btoa(unescape(encodeURIComponent(file.name)));
        const encodedFolder = btoa(unescape(encodeURIComponent(currentFolder || '/')));
        const finalizeRes = await fetch('/api/user/cdn/upload', {
          method: 'POST',
          headers: {
            'x-upload-token': initData.uploadToken,
            'x-upload-original-name': encodedName,
            'x-upload-folder-path': encodedFolder,
            'x-upload-is-public': uploadVisibility === 'PUBLIC' ? 'true' : 'false',
            'x-upload-bucket': selectedBucket,
            'x-upload-subscription-id': String(id),
          },
        });
        const finalizeData = await finalizeRes.json();
        if (!finalizeRes.ok) throw new Error(finalizeData.error || `Failed to upload ${file.name}`);
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

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    setCreatingBucket(true);
    try {
      const res = await fetch('/api/user/cdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createBucket',
          subscriptionId: Number(id),
          bucketName: newBucketName.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bucket');
      toast.success(`Bucket "${data.bucket.name}" created`);
      setNewBucketName('');
      setSelectedBucket(data.bucket.name);
      setCurrentFolder('/');
      fetchService(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create bucket');
    } finally {
      setCreatingBucket(false);
    }
  };

  const handleDeleteBucket = (bucketName: string) => {
    setConfirmState({
      title: 'Delete CDN Bucket',
      message: `Permanently delete bucket "${bucketName}"? Only empty buckets can be deleted.`,
      confirmText: 'Delete Bucket',
      onConfirm: async () => {
        const res = await fetch('/api/user/cdn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteBucket', bucketName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete bucket');
        toast.success(`Bucket "${bucketName}" deleted`);
        if (selectedBucket === bucketName && service?.buckets?.length > 0) {
          const fallback = service.buckets.find((b: any) => b.name !== bucketName);
          if (fallback) setSelectedBucket(fallback.name);
        }
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
      message: `Permanently terminate "${service?.name}"? All buckets, files, and API keys for this instance will be deleted.`,
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
      <div className="min-h-[380px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
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
                onClick={() => handleCopy(primaryBucket, 'Primary Bucket')}
                className={cn(
                  'font-mono px-2 py-0.5 rounded-md text-[11px] font-semibold truncate max-w-[220px] sm:max-w-none transition-colors border cursor-pointer',
                  isDark ? 'text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border-cyan-500/20' : 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200'
                )}
                title="Click to copy primary bucket name"
              >
                {primaryBucket}
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto pt-3 md:pt-0 shrink-0">
          <Link
            href={`/dashboard/checkout?service=CDN&upgrade=${id}`}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Upgrade Plan</span>
          </Link>

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
                Primary Isolated Bucket
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
                  onClick={() => handleCopy(primaryBucket, 'Bucket Name')}
                  className={cn('p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0', isDark ? 'border-white/10 hover:bg-white/5 text-zinc-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700')}
                  title="Copy Bucket Name"
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
                  {publicEndpoint ? publicEndpoint.replace(/^https?:\/\//, '') : 'Edge RustFS Cluster'}
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
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Active Buckets:</span>
              <span className={cn('font-mono font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{service.buckets?.length || 1} Buckets</span>
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
            'lg:col-span-7 lg:order-3 h-full flex flex-col justify-between border rounded-2xl p-5 sm:p-6 space-y-4 transition-all shadow-2xs',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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

          <pre className={cn('p-3.5 rounded-xl border font-mono text-[11px] leading-relaxed overflow-x-auto', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-300' : 'bg-slate-900 border-slate-800 text-cyan-300')}>
{`curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/upload" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@./image.png" -F "bucket=${selectedBucket || primaryBucket}" -F "isPublic=true"`}
          </pre>
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
            <Link
              href={`/dashboard/checkout?service=CDN&upgrade=${id}`}
              className={cn('text-xs font-bold hover:underline flex items-center gap-1', isDark ? 'text-cyan-400' : 'text-cyan-700')}
            >
              <span>Upgrade</span>
              <Rocket className="w-3 h-3" />
            </Link>
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
            { id: 'buckets', label: 'Buckets', icon: Database, count: service.buckets?.length },
            { id: 'api', label: 'REST API & Keys', icon: KeyRound, count: apiKeys.length },
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
            {service.buckets?.length || 1} Buckets • {apiKeys.length} API Keys
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
            <div className="flex flex-wrap items-center gap-2">
              <CustomSelect
                value={selectedBucket}
                onChange={(val) => { setSelectedBucket(val); setCurrentFolder('/'); }}
                isDark={isDark}
                className="w-56"
                options={(service.buckets || []).map((b: any) => ({
                  value: b.name,
                  label: b.isDefault ? `${b.name} (Primary)` : b.name,
                }))}
              />

              <div className={cn('flex items-center gap-1 text-xs font-mono px-3 py-2 rounded-xl border flex-wrap', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
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

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial min-w-0">
                <Search className={cn('w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-zinc-500' : 'text-slate-400')} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className={cn('w-full sm:w-44 rounded-xl pl-8 pr-3 py-2 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400')}
                />
              </div>

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
                            <Folder className={cn('w-4 h-4 shrink-0', isDark ? 'text-amber-400' : 'text-amber-600')} />
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
                            <Folder className={cn('w-5 h-5 shrink-0', isDark ? 'text-amber-400' : 'text-amber-600')} />
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

      {/* Tab 2: Buckets */}
      {tab === 'buckets' && (
        <div className={cn('rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Isolated CDN Buckets</h2>
              <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                Each bucket name is globally unique across the Masdika Edge RustFS cluster.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateBucket} className="flex flex-col sm:flex-row gap-2 max-w-xl">
            <input
              type="text"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
              placeholder="new-unique-bucket-name"
              className={cn('flex-1 rounded-xl px-3.5 py-2 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400')}
            />
            <button
              type="submit"
              disabled={creatingBucket || !newBucketName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{creatingBucket ? 'Creating...' : 'Create Bucket'}</span>
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(service.buckets || []).map((b: any) => (
              <div key={b.id} className={cn('p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-mono font-bold truncate', isDark ? 'text-cyan-400' : 'text-cyan-700')}>{b.name}</span>
                    {b.isDefault && (
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-100 text-cyan-800')}>
                        PRIMARY
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(b.name, 'Bucket Name')}
                    className={cn('p-1.5 rounded-lg cursor-pointer', isDark ? 'text-zinc-400 hover:text-white hover:bg-white/[0.05]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!b.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBucket(b.name)}
                      className={cn('p-1.5 rounded-lg cursor-pointer', isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
            <pre className={cn('overflow-x-auto p-3.5 rounded-xl border font-mono text-[11px] leading-relaxed', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-300' : 'bg-slate-900 border-slate-800 text-cyan-300')}>
{`# Upload file to bucket "${selectedBucket || primaryBucket}"
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/upload" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@./image.png" \\
  -F "bucket=${selectedBucket || primaryBucket}" \\
  -F "isPublic=true"

# List files in this bucket
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/files?bucket=${selectedBucket || primaryBucket}"

# Download file via API
curl -L -H "Authorization: Bearer YOUR_API_KEY" \\
  "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/cdn/files/FILE_TOKEN" -o output.bin`}
            </pre>
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
              Terminating permanently deletes all buckets, files, and REST API keys for this File CDN instance and stops hourly billing.
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
