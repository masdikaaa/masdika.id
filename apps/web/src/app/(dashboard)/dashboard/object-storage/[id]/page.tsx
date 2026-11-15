'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import {
  ObjectStorageScaleModal,
  type ObjectStoragePlanOption,
  type ObjectStorageClusterCapacity,
} from '@/components/ObjectStorageScaleModal';
import {
  ChevronLeft,
  Database,
  KeyRound,
  Settings,
  Plus,
  Trash2,
  UploadCloud,
  Folder,
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
  TrendingUp,
  HardDrive,
  Search,
  Terminal,
  ShieldAlert,
  Layers,
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

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium border transition-colors cursor-pointer focus:outline-none',
          open
            ? 'border-cyan-500'
            : isDark
              ? 'border-white/[0.08] hover:border-white/20'
              : 'border-slate-200 hover:border-slate-300',
          isDark ? 'bg-[#0a0a0c] text-white' : 'bg-slate-50 text-slate-900'
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 transition-transform',
            isDark ? 'text-zinc-400' : 'text-slate-500',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 mt-1.5 min-w-full w-40 rounded-xl border py-1 z-50',
            isDark
              ? 'bg-[#16161b] border-white/[0.12] shadow-2xl'
              : 'bg-white border-slate-200 shadow-lg'
          )}
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer focus:outline-none',
                  isActive
                    ? isDark
                      ? 'bg-cyan-500/10 text-cyan-400 font-semibold'
                      : 'bg-cyan-50 text-cyan-700 font-semibold'
                    : isDark
                      ? 'text-zinc-300 hover:bg-white/[0.05]'
                      : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
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

export default function ObjectStorageConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<any>(null);
  const [publicEndpoint, setPublicEndpoint] = useState('');
  const [tab, setTab] = useState<'buckets' | 'keys' | 'settings'>('buckets');

  // Bucket Browser State
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [prefix, setPrefix] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [objects, setObjects] = useState<Array<{ key: string; size: number; lastModified: string | null }>>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [objectSearch, setObjectSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Create Bucket State
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketVis, setNewBucketVis] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [creatingBucket, setCreatingBucket] = useState(false);

  // IAM Key State
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerm, setNewKeyPerm] = useState<'READ_WRITE' | 'READ_ONLY'>('READ_WRITE');
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedCred, setRevealedCred] = useState<{ accessKey: string; secretKey: string } | null>(null);
  const [sdkTab, setSdkTab] = useState<'cli' | 'node' | 'python' | 'laravel'>('cli');

  // Scale / Rename State
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [plans, setPlans] = useState<ObjectStoragePlanOption[]>([]);
  const [capacity, setCapacity] = useState<ObjectStorageClusterCapacity | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchScaleMetadata = async () => {
    try {
      const [pubRes, capRes] = await Promise.all([
        fetch('/api/public/plans').then((r) => r.json()).catch(() => null),
        fetch('/api/user/object-storage/capacity').then((r) => r.json()).catch(() => null),
      ]);

      if (capRes?.data) setCapacity(capRes.data);

      const pubObjPlans = Array.isArray(pubRes?.data)
        ? pubRes.data.filter((p: any) => p.service === 'OBJECT_STORAGE')
        : [];
      if (pubObjPlans.length > 0) {
        const mapped: ObjectStoragePlanOption[] = pubObjPlans.map((p: any) => {
          let limits: any = {};
          try {
            limits = JSON.parse(p.limits || '{}');
          } catch {
            limits = {};
          }
          const storageGb = Number(limits.storageGb) || parseInt(String(limits.storage || '10'), 10) || 10;
          return {
            id: String(p.id),
            name: p.name,
            storageGb,
            monthlyPrice: p.price,
            hourlyRate: p.hourlyPrice || Math.max(1, Math.ceil(p.price / 730)),
            maxBuckets: limits.maxBuckets !== undefined ? Number(limits.maxBuckets) : undefined,
            maxKeys: limits.maxKeys !== undefined ? Number(limits.maxKeys) : undefined,
            isPopular: Boolean(p.isPopular),
          };
        });
        setPlans(mapped);
      }
    } catch {
      // ignore metadata errors
    }
  };

  const fetchService = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/object-storage/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not found');
      setService(data.service);
      setPublicEndpoint(data.publicEndpoint || '');
      setEditName(data.service.name);
      if (!selectedBucket && data.service.buckets?.length > 0) {
        setSelectedBucket(data.service.buckets[0].name);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load Object Storage console');
    } finally {
      setLoading(false);
    }
  };

  const fetchObjects = async (bucketName: string, pfx: string) => {
    setLoadingObjects(true);
    try {
      const res = await fetch(`/api/user/object-storage/${id}/buckets/${encodeURIComponent(bucketName)}/objects?prefix=${encodeURIComponent(pfx)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFolders(data.folders || []);
      setObjects(data.objects || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to list objects');
    } finally {
      setLoadingObjects(false);
    }
  };

  useEffect(() => {
    fetchService();
    fetchScaleMetadata();
    try {
      const raw = sessionStorage.getItem(`obj_init_creds_${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.accessKey && parsed?.secretKey) {
          setRevealedCred({ accessKey: parsed.accessKey, secretKey: parsed.secretKey });
        }
        sessionStorage.removeItem(`obj_init_creds_${id}`);
      }
    } catch {
      // ignore storage errors
    }
  }, [id]);

  useEffect(() => {
    if (selectedBucket && service?.status !== 'SUSPENDED') {
      fetchObjects(selectedBucket, prefix);
    }
  }, [selectedBucket, prefix, service?.status]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    setCreatingBucket(true);
    try {
      const res = await fetch(`/api/user/object-storage/${id}/buckets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBucketName.trim().toLowerCase(), visibility: newBucketVis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Bucket "${data.bucket.name}" created`);
      setNewBucketName('');
      setSelectedBucket(data.bucket.name);
      setPrefix('');
      fetchService();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create bucket');
    } finally {
      setCreatingBucket(false);
    }
  };

  const handleToggleBucketVis = async (bucketName: string, currentVis: string) => {
    const nextVis = currentVis === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    try {
      const res = await fetch(`/api/user/object-storage/${id}/buckets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: bucketName, visibility: nextVis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Bucket "${bucketName}" is now ${nextVis}`);
      fetchService();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update bucket ACL');
    }
  };

  const handleDeleteBucket = (bucketName: string) => {
    setConfirmDialog({
      title: 'Delete S3 Bucket',
      description: `Permanently delete bucket "${bucketName}" and all objects inside? This action cannot be undone.`,
      confirmLabel: 'Delete Bucket',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/user/object-storage/${id}/buckets?name=${encodeURIComponent(bucketName)}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          toast.success(`Bucket "${bucketName}" deleted`);
          if (selectedBucket === bucketName) setSelectedBucket(null);
          fetchService();
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete bucket');
        }
      },
    });
  };

  const uploadSingleFile = async (file: File) => {
    if (!selectedBucket) return;
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const form = new FormData();
      form.append('file', file);
      if (prefix) form.append('prefix', prefix);
      const res = await fetch(`/api/user/object-storage/${id}/buckets/${encodeURIComponent(selectedBucket)}/objects`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Uploaded ${file.name}`, { id: toastId });
      fetchObjects(selectedBucket, prefix);
      fetchService();
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed', { id: toastId });
    }
  };

  const handleUploadObject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadSingleFile(file);
    e.target.value = '';
  };

  const handleDropUpload = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (service?.status === 'SUSPENDED' || !selectedBucket) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadSingleFile(file);
  };

  const handlePresign = async (key: string) => {
    if (!selectedBucket) return;
    try {
      const res = await fetch(`/api/user/object-storage/${id}/buckets/${encodeURIComponent(selectedBucket)}/objects?presignKey=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await navigator.clipboard.writeText(data.url);
      toast.success('15-min Presigned URL copied to clipboard!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate presigned URL');
    }
  };

  const handleDeleteObject = async (key: string) => {
    if (!selectedBucket) return;
    try {
      const res = await fetch(`/api/user/object-storage/${id}/buckets/${encodeURIComponent(selectedBucket)}/objects?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Object deleted');
      fetchObjects(selectedBucket, prefix);
      fetchService();
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch(`/api/user/object-storage/${id}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), permission: newKeyPerm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRevealedCred({ accessKey: data.key.accessKey, secretKey: data.secretKey });
      setNewKeyName('');
      toast.success('S3 Access Key provisioned!');
      fetchService();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create S3 key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = (keyId: number) => {
    setConfirmDialog({
      title: 'Revoke S3 Access Key',
      description: 'Revoke this S3 Access Key? Any applications using it will lose access immediately.',
      confirmLabel: 'Revoke Key',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/user/object-storage/${id}/keys?keyId=${keyId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed');
          toast.success('S3 key revoked');
          fetchService();
        } catch {
          toast.error('Failed to revoke key');
        }
      },
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/user/object-storage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Service name updated');
      fetchService();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update service');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTerminate = () => {
    setConfirmDialog({
      title: 'Terminate Object Storage',
      description: `Permanently delete "${service?.name || 'this service'}", all buckets, objects, and S3 Access Keys? Hourly billing will stop immediately.`,
      confirmLabel: 'Terminate Service',
      onConfirm: async () => {
        setTerminating(true);
        try {
          const res = await fetch(`/api/user/object-storage/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed');
          toast.success('Object Storage service terminated');
          router.push('/dashboard/object-storage');
        } catch {
          toast.error('Failed to terminate service');
          setTerminating(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-slate-600')}>Object Storage service not found.</p>
        <Link href="/dashboard/object-storage" className={cn('text-xs font-bold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
          Back to Object Storage
        </Link>
      </div>
    );
  }

  const activeBucketObj = service.buckets?.find((b: any) => b.name === selectedBucket);
  const currentMonthly = service.monthlyPrice || Math.round((service.hourlyRate || 0) * 720);
  const activePlanMeta = plans.find((p) => p.storageGb === service.storageGb);
  const maxBucketsLabel = activePlanMeta?.maxBuckets === -1 ? '∞' : activePlanMeta?.maxBuckets ?? '—';
  const maxKeysLabel = activePlanMeta?.maxKeys === -1 ? '∞' : activePlanMeta?.maxKeys ?? '—';
  const quotaBytes = service.storageGb * 1024 * 1024 * 1024;
  const usedPercent = quotaBytes > 0 ? Math.min(100, Math.round(((service.usedBytes || 0) / quotaBytes) * 100)) : 0;

  const filteredFolders = folders.filter((f) =>
    f.slice(prefix.length).toLowerCase().includes(objectSearch.trim().toLowerCase())
  );
  const filteredObjects = objects.filter((o) =>
    o.key.slice(prefix.length).toLowerCase().includes(objectSearch.trim().toLowerCase())
  );

  const endpointVal = publicEndpoint || 'https://s3.masdika.id';
  const bucketVal = selectedBucket || 'your-bucket';
  const sdkSnippets: Record<'cli' | 'node' | 'python' | 'laravel', string> = {
    cli: `# AWS CLI v2
export AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"

aws s3 ls s3://${bucketVal} \\
  --endpoint-url ${endpointVal}`,
    node: `// npm install @aws-sdk/client-s3
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "${endpointVal}",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});`,
    python: `# pip install boto3
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url="${endpointVal}",
    aws_access_key_id="YOUR_ACCESS_KEY",
    aws_secret_access_key="YOUR_SECRET_KEY",
    region_name="us-east-1",
)`,
    laravel: `// config/filesystems.php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => 'us-east-1',
    'bucket' => '${bucketVal}',
    'endpoint' => '${endpointVal}',
    'use_path_style_endpoint' => true,
],`,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button matching Managed Apps */}
      <div>
        <Link
          href="/dashboard/object-storage"
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            isDark
              ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Object Storage
        </Link>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={cn(
              'w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0',
              isDark
                ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400'
                : 'bg-cyan-50 border-cyan-200 text-cyan-600'
            )}
          >
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={cn('text-xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
                {service.name}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                  service.status === 'SUSPENDED'
                    ? isDark
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                    : isDark
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', service.status === 'SUSPENDED' ? 'bg-amber-400' : 'bg-emerald-400')} />
                {service.status === 'SUSPENDED' ? 'Suspended (Grace Period 3 Hari)' : service.status}
              </span>
            </div>
            <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              {service.planName} • Sidoarjo (ID-SDA) • AWS S3 Compatible
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setScaleModalOpen(true)}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none',
              isDark
                ? 'bg-[#111115] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
                : 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Scale / Upgrade
          </button>

          {publicEndpoint && (
            <button
              type="button"
              onClick={() => handleCopy(publicEndpoint, 'S3 Endpoint')}
              className={cn(
                'px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 transition-colors cursor-pointer focus:outline-none',
                isDark
                  ? 'bg-[#111115] border-white/[0.08] hover:border-white/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              )}
              title="Click to copy S3 Endpoint"
            >
              <Globe className={cn('w-3.5 h-3.5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
              <code className={cn('font-mono font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>{publicEndpoint}</code>
              <Copy className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-400' : 'text-slate-400')} />
            </button>
          )}
        </div>
      </div>

      {/* Overview Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={cn('p-4 rounded-2xl border space-y-2', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>STORAGE QUOTA</span>
            <span className={cn('font-mono font-bold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>{usedPercent}%</span>
          </div>
          <div className={cn('text-sm font-bold font-mono', isDark ? 'text-white' : 'text-slate-900')}>
            {formatBytes(service.usedBytes || 0)} <span className={cn('text-xs font-normal', isDark ? 'text-zinc-500' : 'text-slate-400')}>/ {service.storageGb} GB</span>
          </div>
          <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/[0.06]' : 'bg-slate-100')}>
            <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${Math.max(usedPercent, 2)}%` }} />
          </div>
        </div>

        <div className={cn('p-4 rounded-2xl border space-y-1', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className={cn('text-[11px] font-semibold', isDark ? 'text-zinc-400' : 'text-slate-500')}>S3 BUCKETS</div>
          <div className={cn('text-lg font-extrabold font-mono', isDark ? 'text-white' : 'text-slate-900')}>
            {service.buckets?.length || 0} <span className={cn('text-xs font-normal', isDark ? 'text-zinc-500' : 'text-slate-400')}>/ {maxBucketsLabel}</span>
          </div>
          <div className={cn('text-[11px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>Isolated namespaces</div>
        </div>

        <div className={cn('p-4 rounded-2xl border space-y-1', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className={cn('text-[11px] font-semibold', isDark ? 'text-zinc-400' : 'text-slate-500')}>IAM ACCESS KEYS</div>
          <div className={cn('text-lg font-extrabold font-mono', isDark ? 'text-white' : 'text-slate-900')}>
            {service.keys?.length || 0} <span className={cn('text-xs font-normal', isDark ? 'text-zinc-500' : 'text-slate-400')}>/ {maxKeysLabel}</span>
          </div>
          <div className={cn('text-[11px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>Scoped S3 credentials</div>
        </div>

        <div className={cn('p-4 rounded-2xl border space-y-1', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className={cn('text-[11px] font-semibold', isDark ? 'text-zinc-400' : 'text-slate-500')}>BILLING RATE</div>
          <div className={cn('text-lg font-extrabold font-mono', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
            Rp {currentMonthly.toLocaleString('id-ID')}<span className={cn('text-xs font-normal', isDark ? 'text-zinc-500' : 'text-slate-400')}>/mo</span>
          </div>
          <div className={cn('text-[11px] font-mono', isDark ? 'text-zinc-500' : 'text-slate-500')}>~Rp {service.hourlyRate.toLocaleString('id-ID')}/hr PAYG</div>
        </div>
      </div>

      {/* Initial Credentials One-Time Banner */}
      {revealedCred && (
        <div className={cn('p-4 rounded-2xl border text-xs space-y-2', isDark ? 'border-emerald-500/35 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50')}>
          <div className="flex items-center justify-between gap-2">
            <span className={cn('font-bold', isDark ? 'text-emerald-400' : 'text-emerald-800')}>
              S3 IAM Credentials Provisioned (copy Secret Key now — shown once)
            </span>
            <button
              type="button"
              onClick={() => setRevealedCred(null)}
              className={cn('text-[11px] font-semibold cursor-pointer', isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
            <div className={cn('p-2.5 rounded-xl border flex items-center justify-between gap-2', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-emerald-200')}>
              <span className={cn('truncate', isDark ? 'text-cyan-300' : 'text-cyan-800')}>AK: {revealedCred.accessKey}</span>
              <button type="button" onClick={() => handleCopy(revealedCred.accessKey, 'Access Key')} className="shrink-0 opacity-75 hover:opacity-100 cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className={cn('p-2.5 rounded-xl border flex items-center justify-between gap-2', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-emerald-200')}>
              <span className={cn('truncate', isDark ? 'text-emerald-300' : 'text-emerald-800')}>SK: {revealedCred.secretKey}</span>
              <button type="button" onClick={() => handleCopy(revealedCred.secretKey, 'Secret Key')} className="shrink-0 opacity-75 hover:opacity-100 cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {service.status === 'SUSPENDED' && (
        <div className={cn('p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs', isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900')}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle className={cn('w-5 h-5 shrink-0', isDark ? 'text-amber-400' : 'text-amber-600')} />
            <span>Service suspended due to insufficient balance (3-day grace period). Top up your wallet to automatically re-enable your S3 keys.</span>
          </div>
          <Link href="/dashboard/billing" className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shrink-0 text-center">
            Top Up Now
          </Link>
        </div>
      )}

      {/* Segmented Navigation Tabs */}
      <div className={cn('inline-flex flex-wrap gap-1 p-1 rounded-2xl border', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-slate-100 border-slate-200')}>
        {[
          { id: 'buckets', label: 'Buckets & Objects', icon: Database },
          { id: 'keys', label: 'IAM Access Keys & SDK', icon: KeyRound },
          { id: 'settings', label: 'Scale & Settings', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer focus:outline-none',
                active
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : isDark
                    ? 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Buckets & Objects */}
      {tab === 'buckets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Buckets List */}
          <div className={cn('lg:col-span-4 rounded-2xl border p-4 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>S3 Buckets</h2>
              </div>
              <span className={cn('text-[11px] font-mono', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                {service.buckets?.length || 0} / {maxBucketsLabel}
              </span>
            </div>

            <form onSubmit={handleCreateBucket} className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
                  placeholder="new-bucket-name"
                  className={cn(
                    'flex-1 min-w-0 rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-cyan-500',
                    isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  )}
                />
                <CustomSelect
                  value={newBucketVis}
                  onChange={setNewBucketVis}
                  isDark={isDark}
                  className="w-28 shrink-0"
                  options={[
                    { value: 'PRIVATE', label: 'Private' },
                    { value: 'PUBLIC', label: 'Public' },
                  ]}
                />
              </div>
              <button
                type="submit"
                disabled={creatingBucket || !newBucketName.trim() || service.status === 'SUSPENDED'}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> {creatingBucket ? 'Creating...' : 'Create Bucket'}
              </button>
            </form>

            <div className="space-y-2">
              {(service.buckets || []).map((b: any) => (
                <div
                  key={b.id}
                  onClick={() => { setSelectedBucket(b.name); setPrefix(''); setObjectSearch(''); }}
                  className={cn(
                    'px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all',
                    selectedBucket === b.name
                      ? isDark
                        ? 'border-cyan-500/60 bg-cyan-500/[0.08]'
                        : 'border-cyan-500 bg-cyan-50/70'
                      : isDark
                        ? 'border-white/[0.06] bg-[#0a0a0c] hover:border-white/20'
                        : 'border-slate-200 bg-slate-50 hover:border-cyan-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-xs font-bold font-mono truncate', isDark ? 'text-white' : 'text-slate-900')}>{b.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleBucketVis(b.name, b.visibility)}
                        title="Toggle Public/Private ACL"
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer',
                          b.visibility === 'PUBLIC'
                            ? isDark
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-emerald-100 text-emerald-700'
                            : isDark
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {b.visibility === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {b.visibility}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBucket(b.name)}
                        title="Delete Bucket"
                        className={cn('p-1 transition-colors cursor-pointer', isDark ? 'text-zinc-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Object Browser with Drag & Drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropUpload}
            className={cn(
              'lg:col-span-8 rounded-2xl border p-5 space-y-4 transition-colors',
              dragOver
                ? 'border-cyan-400 bg-cyan-500/[0.06]'
                : isDark
                  ? 'bg-[#111115] border-white/[0.08]'
                  : 'bg-white border-slate-200/90 shadow-2xs'
            )}
          >
            {!selectedBucket ? (
              <div className={cn('py-20 text-center text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>Select or create a bucket to browse objects.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className={cn('flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl border flex-wrap', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                    <button type="button" onClick={() => setPrefix('')} className={cn('font-bold hover:underline cursor-pointer', isDark ? 'text-cyan-400' : 'text-cyan-600')}>{selectedBucket}</button>
                    {prefix.split('/').filter(Boolean).map((seg, i, arr) => {
                      const pathUpTo = arr.slice(0, i + 1).join('/') + '/';
                      return (
                        <span key={pathUpTo} className="flex items-center gap-1">
                          <ChevronRight className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-slate-400')} />
                          <button type="button" onClick={() => setPrefix(pathUpTo)} className={cn('cursor-pointer', isDark ? 'text-zinc-300 hover:text-white' : 'text-slate-700 hover:text-slate-900')}>{seg}</button>
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className={cn('w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-zinc-500' : 'text-slate-400')} />
                      <input
                        type="text"
                        value={objectSearch}
                        onChange={(e) => setObjectSearch(e.target.value)}
                        placeholder="Filter objects..."
                        className={cn(
                          'w-36 sm:w-44 rounded-xl pl-8 pr-3 py-2 text-xs border focus:outline-none focus:border-cyan-500',
                          isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        )}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchObjects(selectedBucket, prefix)}
                      title="Refresh objects"
                      className={cn(
                        'p-2 rounded-xl border transition-colors cursor-pointer',
                        isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300 hover:border-white/20' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      <RefreshCw className={cn('w-3.5 h-3.5', loadingObjects && 'animate-spin')} />
                    </button>
                    <label className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5" /> Upload Object
                      <input type="file" onChange={handleUploadObject} className="hidden" disabled={service.status === 'SUSPENDED'} />
                    </label>
                  </div>
                </div>

                {activeBucketObj?.visibility === 'PUBLIC' && publicEndpoint && (
                  <div className={cn('p-3 rounded-xl border text-[11px] flex items-center justify-between gap-2', isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800')}>
                    <span className="truncate">
                      Public URL base: <code className="font-mono font-semibold">{publicEndpoint}/{selectedBucket}/&lt;object-key&gt;</code>
                    </span>
                    <button type="button" onClick={() => handleCopy(`${publicEndpoint}/${selectedBucket}/`, 'Public Base URL')} className="shrink-0 opacity-80 hover:opacity-100 cursor-pointer">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {loadingObjects ? (
                  <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
                ) : filteredFolders.length === 0 && filteredObjects.length === 0 ? (
                  <div className={cn('py-14 px-6 rounded-2xl border border-dashed text-center space-y-3', isDark ? 'border-white/[0.1] bg-[#0a0a0c]/50' : 'border-slate-300 bg-slate-50/70')}>
                    <div className={cn('w-10 h-10 rounded-xl mx-auto flex items-center justify-center border', isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-600')}>
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                        {objectSearch ? 'No matching objects found' : 'Bucket prefix is empty'}
                      </p>
                      <p className={cn('text-[11px] mt-1', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                        Drag &amp; drop a file here, click Upload Object, or connect via S3 SDK.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={cn('divide-y border rounded-xl overflow-hidden', isDark ? 'divide-white/[0.06] border-white/[0.06] bg-[#0a0a0c]' : 'divide-slate-200 border-slate-200 bg-white')}>
                    {filteredFolders.map((f) => (
                      <div key={f} onClick={() => setPrefix(f)} className={cn('p-3 flex items-center justify-between cursor-pointer text-xs', isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50')}>
                        <div className={cn('flex items-center gap-2.5 font-semibold', isDark ? 'text-amber-400' : 'text-amber-600')}>
                          <Folder className="w-4 h-4" /> {f.slice(prefix.length)}
                        </div>
                        <ChevronRight className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-600' : 'text-slate-400')} />
                      </div>
                    ))}
                    {filteredObjects.map((obj) => (
                      <div key={obj.key} className={cn('p-3 flex items-center justify-between gap-3 text-xs', isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50')}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <File className={cn('w-4 h-4 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                          <span className={cn('truncate font-mono', isDark ? 'text-zinc-200' : 'text-slate-800')}>{obj.key.slice(prefix.length)}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={cn('font-mono text-[11px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>{formatBytes(obj.size)}</span>
                          <button type="button" onClick={() => handlePresign(obj.key)} title="Copy 15-min Presigned URL" className={cn('p-1 cursor-pointer', isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700')}><Link2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDeleteObject(obj.key)} title="Delete Object" className={cn('p-1 cursor-pointer', isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700')}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: IAM Access Keys & SDK Examples */}
      {tab === 'keys' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className={cn('lg:col-span-6 rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Isolated S3 IAM Access Keys</h2>
              </div>
              <span className={cn('text-[11px] font-mono', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                {service.keys?.length || 0} / {maxKeysLabel}
              </span>
            </div>

            <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. backend-app)"
                className={cn(
                  'flex-1 rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-cyan-500',
                  isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                )}
              />
              <CustomSelect
                value={newKeyPerm}
                onChange={setNewKeyPerm}
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm disabled:opacity-50 cursor-pointer transition-colors shrink-0"
              >
                {creatingKey ? 'Creating...' : 'Create Key'}
              </button>
            </form>

            <div className="space-y-2">
              {(service.keys || []).map((k: any) => (
                <div key={k.id} className={cn('p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                  <div className="min-w-0">
                    <div className={cn('font-bold truncate', isDark ? 'text-white' : 'text-slate-900')}>{k.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <code className={cn('font-mono text-[11px] truncate', isDark ? 'text-zinc-400' : 'text-slate-500')}>{k.accessKey}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(k.accessKey, 'Access Key')}
                        title="Copy Access Key"
                        className={cn('p-0.5 cursor-pointer', isDark ? 'text-zinc-500 hover:text-cyan-400' : 'text-slate-400 hover:text-cyan-600')}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-100 text-cyan-800')}>{k.permission}</span>
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', k.isActive ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700'))}>
                      {k.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    <button type="button" onClick={() => handleDeleteKey(k.id)} title="Revoke Key" className={cn('p-1 cursor-pointer', isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700')}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cn('lg:col-span-6 rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>S3 SDK &amp; CLI Quickstart</h2>
              </div>
              <div className={cn('inline-flex p-0.5 rounded-xl border text-[11px] font-bold', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-100 border-slate-200')}>
                {(
                  [
                    { id: 'cli', label: 'AWS CLI' },
                    { id: 'node', label: 'Node.js' },
                    { id: 'python', label: 'Python' },
                    { id: 'laravel', label: 'Laravel' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSdkTab(item.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg transition-colors cursor-pointer focus:outline-none',
                      sdkTab === item.id
                        ? 'bg-cyan-400 text-slate-950'
                        : isDark
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => handleCopy(sdkSnippets[sdkTab], 'SDK snippet')}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <pre className={cn('p-4 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-300' : 'bg-slate-900 border-slate-800 text-cyan-300')}>
                {sdkSnippets[sdkTab]}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Scale & Settings */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className={cn('lg:col-span-7 rounded-2xl border p-5 space-y-5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div className={cn('p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-slate-400')}>ACTIVE STORAGE TIER</div>
                <div className={cn('text-sm font-bold mt-0.5', isDark ? 'text-white' : 'text-slate-900')}>
                  {service.planName} • {service.storageGb} GB SSD
                </div>
                <div className={cn('text-[11px] mt-0.5 font-mono', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                  Rp {currentMonthly.toLocaleString('id-ID')}/mo (~Rp {service.hourlyRate.toLocaleString('id-ID')}/hr)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScaleModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Upgrade Tier
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div>
                <label className={cn('block text-xs font-bold mb-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>Service Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={cn(
                    'w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500',
                    isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  )}
                />
              </div>
              <button
                type="submit"
                disabled={savingSettings || editName.trim() === service.name || !editName.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
              >
                {savingSettings ? 'Saving...' : 'Save Name'}
              </button>
            </form>
          </div>

          <div className={cn('lg:col-span-5 rounded-2xl border p-5 space-y-3', isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50')}>
            <div className="flex items-center gap-2">
              <ShieldAlert className={cn('w-4 h-4', isDark ? 'text-red-400' : 'text-red-600')} />
              <h2 className={cn('text-sm font-bold', isDark ? 'text-red-400' : 'text-red-700')}>Danger Zone</h2>
            </div>
            <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-red-800')}>
              Terminating permanently deletes all buckets, objects, and S3 Access Keys from Customer RustFS and stops hourly billing.
            </p>
            <button type="button" onClick={handleTerminate} disabled={terminating} className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white cursor-pointer transition-colors">
              {terminating ? 'Terminating...' : 'Terminate Object Storage'}
            </button>
          </div>
        </div>
      )}

      <ObjectStorageScaleModal
        isOpen={scaleModalOpen}
        onClose={() => setScaleModalOpen(false)}
        service={{
          id: service.id,
          name: service.name,
          planName: service.planName,
          storageGb: service.storageGb,
          monthlyPrice: service.monthlyPrice,
          hourlyRate: service.hourlyRate,
          usedBytes: service.usedBytes,
          bucketsCount: service.buckets?.length || 0,
          keysCount: service.keys?.length || 0,
        }}
        plans={plans}
        capacity={capacity}
        onSuccess={() => {
          fetchService();
          fetchScaleMetadata();
        }}
        isDark={isDark}
      />

      {/* Consistent Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={cn(
              'w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl relative',
              isDark
                ? 'bg-[#101014] border-white/[0.08] text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            )}
          >
            <button
              type="button"
              onClick={() => !confirmLoading && setConfirmDialog(null)}
              disabled={confirmLoading}
              className={cn(
                'absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer',
                isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">{confirmDialog.title}</h3>
                <p className={cn('text-xs mt-1 leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className={cn('flex items-center justify-end gap-2.5 pt-3 border-t', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={confirmLoading}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer',
                  isDark ? 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={async () => {
                  setConfirmLoading(true);
                  try {
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  } finally {
                    setConfirmLoading(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {confirmLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{confirmDialog.confirmLabel}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
