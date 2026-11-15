'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import {
  ArrowLeft,
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
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface StoragePlanOption {
  id: string;
  name: string;
  storageGb: number;
  monthlyPrice: number;
  hourlyRate: number;
  maxBuckets?: number;
  maxKeys?: number;
}

interface StorageClusterCapacity {
  available: boolean;
  totalPoolGb: number;
  allocatedGb: number;
  freeGb: number;
  reason?: string;
}

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
                  'w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer',
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
  const [ratePerGb, setRatePerGb] = useState(500);
  const [tab, setTab] = useState<'buckets' | 'keys' | 'settings'>('buckets');

  // Bucket Browser State
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [prefix, setPrefix] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [objects, setObjects] = useState<Array<{ key: string; size: number; lastModified: string | null }>>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);

  // Create Bucket State
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketVis, setNewBucketVis] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [creatingBucket, setCreatingBucket] = useState(false);

  // IAM Key State
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerm, setNewKeyPerm] = useState<'READ_WRITE' | 'READ_ONLY'>('READ_WRITE');
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedCred, setRevealedCred] = useState<{ accessKey: string; secretKey: string } | null>(null);

  // Scale / Rename State
  const [editName, setEditName] = useState('');
  const [editStorageGb, setEditStorageGb] = useState(50);
  const [plans, setPlans] = useState<StoragePlanOption[]>([]);
  const [capacity, setCapacity] = useState<StorageClusterCapacity | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [activeCommitment, setActiveCommitment] = useState(0);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const fetchScaleMetadata = async () => {
    setLoadingBilling(true);
    try {
      const [pubRes, capRes, billRes] = await Promise.all([
        fetch('/api/public/plans').then((r) => r.json()).catch(() => null),
        fetch('/api/user/object-storage/capacity').then((r) => r.json()).catch(() => null),
        fetch('/api/user/billing').then((r) => r.json()).catch(() => null),
      ]);

      if (capRes?.data) setCapacity(capRes.data);

      const pubObjPlans = Array.isArray(pubRes?.data)
        ? pubRes.data.filter((p: any) => p.service === 'OBJECT_STORAGE')
        : [];
      if (pubObjPlans.length > 0) {
        const mapped: StoragePlanOption[] = pubObjPlans.map((p: any) => {
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
          };
        });
        setPlans(mapped);
      }

      if (billRes?.data?.balance !== undefined) {
        setUserBalance(billRes.data.balance);
      } else if (billRes?.user?.balance !== undefined) {
        setUserBalance(billRes.user.balance);
      }
      if (billRes?.data?.commitment?.totalMonthly !== undefined) {
        setActiveCommitment(billRes.data.commitment.totalMonthly);
      } else if (billRes?.commitment?.totalMonthly !== undefined) {
        setActiveCommitment(billRes.commitment.totalMonthly);
      }
    } finally {
      setLoadingBilling(false);
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
      setRatePerGb(data.ratePerGbMonthly || 500);
      setEditName(data.service.name);
      setEditStorageGb(data.service.storageGb);
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

  const handleDeleteBucket = async (bucketName: string) => {
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
  };

  const handleUploadObject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBucket) return;
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
    } finally {
      e.target.value = '';
    }
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

  const handleDeleteKey = async (keyId: number) => {
    try {
      const res = await fetch(`/api/user/object-storage/${id}/keys?keyId=${keyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('S3 key revoked');
      fetchService();
    } catch {
      toast.error('Failed to revoke key');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/user/object-storage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, storageGb: editStorageGb }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Object Storage upgraded & updated! Zero data loss guaranteed.');
      fetchService();
      fetchScaleMetadata();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update service');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTerminate = async () => {
    if (!confirm('Permanently delete this Object Storage service, all buckets, objects, and S3 keys?')) return;
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

  const currentMonthly = service.monthlyPrice || Math.round((service.hourlyRate || 0) * 730);
  const selectedScalePlan = plans.find((p) => p.storageGb === editStorageGb) || null;
  const newMonthlyPrice = selectedScalePlan
    ? selectedScalePlan.monthlyPrice
    : editStorageGb === service.storageGb
      ? currentMonthly
      : editStorageGb * Math.max(ratePerGb, 2000);
  const newHourlyRate = selectedScalePlan
    ? selectedScalePlan.hourlyRate
    : Math.max(1, Math.ceil(newMonthlyPrice / 730));
  const isUpgradePrice = newMonthlyPrice > currentMonthly;
  const requiredBalance = isUpgradePrice
    ? Math.max(newMonthlyPrice, activeCommitment - currentMonthly + newMonthlyPrice)
    : 0;
  const isScaleBalanceInsufficient = !loadingBilling && isUpgradePrice && userBalance < requiredBalance;
  const scaleShortfall = Math.max(0, requiredBalance - userBalance);
  const scaleDeltaGb = Math.max(0, editStorageGb - service.storageGb);
  const hasScaleClusterCapacity = scaleDeltaGb === 0 || !capacity
    ? true
    : capacity.available && capacity.freeGb >= scaleDeltaGb;
  const isScaleUnchanged = editName.trim() === service.name && editStorageGb === service.storageGb;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/object-storage"
            className={cn(
              'p-2 rounded-xl border transition-colors',
              isDark ? 'bg-[#111115] border-white/[0.08] text-zinc-300 hover:border-white/20' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-2xs'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{service.name}</h1>
              <span
                className={cn(
                  'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                  service.status === 'SUSPENDED'
                    ? isDark
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                    : isDark
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                )}
              >
                {service.status === 'SUSPENDED' ? 'Suspended (Grace Period 3 Hari)' : service.status}
              </span>
            </div>
            <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              {service.planName} • {formatBytes(service.usedBytes || 0)} / {service.storageGb} GB used • Rp {service.hourlyRate.toLocaleString('id-ID')}/hr
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer',
              isDark
                ? 'bg-[#111115] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
                : 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Scale / Upgrade
          </button>

          {publicEndpoint && (
            <div className={cn('px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
              <Globe className={cn('w-3.5 h-3.5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
              <code className={cn('font-mono', isDark ? 'text-cyan-400' : 'text-cyan-600')}>{publicEndpoint}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicEndpoint);
                  toast.success('Copied!');
                }}
                className={cn('transition-colors cursor-pointer', isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-900')}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {revealedCred && (
        <div className={cn('p-4 rounded-2xl border text-xs space-y-1.5 font-mono', isDark ? 'border-emerald-500/35 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50')}>
          <div className="flex items-center justify-between gap-2">
            <span className={cn('font-sans font-bold', isDark ? 'text-emerald-400' : 'text-emerald-800')}>
              Initial S3 IAM Credentials (copy Secret Key now — shown once):
            </span>
            <button
              type="button"
              onClick={() => setRevealedCred(null)}
              className={cn('font-sans text-[11px] font-semibold cursor-pointer', isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}
            >
              Dismiss
            </button>
          </div>
          <div className={cn('break-all', isDark ? 'text-cyan-300' : 'text-cyan-800')}>Access Key: {revealedCred.accessKey}</div>
          <div className={cn('break-all', isDark ? 'text-emerald-300' : 'text-emerald-800')}>Secret Key: {revealedCred.secretKey}</div>
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

      {/* Tabs */}
      <div className={cn('flex flex-wrap gap-2 border-b pb-3', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
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
              onClick={() => setTab(t.id as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
                active
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : isDark
                    ? 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.07]'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Buckets & Objects (AWS S3 Console Style) */}
      {tab === 'buckets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Buckets List */}
          <div className={cn('lg:col-span-4 rounded-2xl border p-4 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div className="flex items-center justify-between">
              <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>S3 Buckets</h2>
              <span className={cn('text-[11px]', isDark ? 'text-zinc-400' : 'text-slate-500')}>{service.buckets?.length || 0} total</span>
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
                  onClick={() => { setSelectedBucket(b.name); setPrefix(''); }}
                  className={cn(
                    'p-3 rounded-xl border cursor-pointer transition-all space-y-2',
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
                    <span className={cn('text-xs font-bold truncate', isDark ? 'text-white' : 'text-slate-900')}>{b.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleBucketVis(b.name, b.visibility)}
                        title="Toggle Public/Private ACL"
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer',
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
                        onClick={() => handleDeleteBucket(b.name)}
                        title="Delete Bucket"
                        className={cn('p-1 transition-colors cursor-pointer', isDark ? 'text-zinc-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className={cn('text-[11px] flex justify-between', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                    <span>{b.objectCount ?? 0} objects</span>
                    <span>{formatBytes(b.totalBytes ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Object Browser */}
          <div className={cn('lg:col-span-8 rounded-2xl border p-4 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            {!selectedBucket ? (
              <div className={cn('py-16 text-center text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>Select or create a bucket to browse objects.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
                    <button onClick={() => setPrefix('')} className={cn('font-bold hover:underline cursor-pointer', isDark ? 'text-cyan-400' : 'text-cyan-600')}>{selectedBucket}</button>
                    {prefix.split('/').filter(Boolean).map((seg, i, arr) => {
                      const pathUpTo = arr.slice(0, i + 1).join('/') + '/';
                      return (
                        <span key={pathUpTo} className="flex items-center gap-1">
                          <ChevronRight className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-500' : 'text-slate-400')} />
                          <button onClick={() => setPrefix(pathUpTo)} className={cn('cursor-pointer', isDark ? 'text-zinc-300 hover:text-white' : 'text-slate-700 hover:text-slate-900')}>{seg}</button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchObjects(selectedBucket, prefix)}
                      className={cn(
                        'p-2 rounded-xl border transition-colors cursor-pointer',
                        isDark ? 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:border-white/20' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
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
                  <div className={cn('p-2.5 rounded-xl border text-[11px]', isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800')}>
                    Public Bucket URL base: <code className="font-mono">{publicEndpoint}/{selectedBucket}/&lt;object-key&gt;</code>
                  </div>
                )}

                {loadingObjects ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
                ) : folders.length === 0 && objects.length === 0 ? (
                  <div className={cn('py-16 text-center text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>This bucket prefix is empty. Upload an object or use any S3 SDK.</div>
                ) : (
                  <div className={cn('divide-y border rounded-xl overflow-hidden', isDark ? 'divide-white/[0.06] border-white/[0.06]' : 'divide-slate-200 border-slate-200')}>
                    {folders.map((f) => (
                      <div key={f} onClick={() => setPrefix(f)} className={cn('p-3 flex items-center justify-between cursor-pointer text-xs', isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50')}>
                        <div className={cn('flex items-center gap-2.5 font-semibold', isDark ? 'text-amber-400' : 'text-amber-600')}>
                          <Folder className="w-4 h-4" /> {f.slice(prefix.length)}
                        </div>
                      </div>
                    ))}
                    {objects.map((obj) => (
                      <div key={obj.key} className={cn('p-3 flex items-center justify-between gap-3 text-xs', isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50')}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <File className={cn('w-4 h-4 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                          <span className={cn('truncate font-mono', isDark ? 'text-zinc-200' : 'text-slate-800')}>{obj.key.slice(prefix.length)}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>{formatBytes(obj.size)}</span>
                          <button onClick={() => handlePresign(obj.key)} title="Copy Presigned URL" className={cn('p-1 cursor-pointer', isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700')}><Link2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteObject(obj.key)} title="Delete Object" className={cn('p-1 cursor-pointer', isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700')}><Trash2 className="w-3.5 h-3.5" /></button>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className={cn('lg:col-span-6 rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Isolated S3 IAM Access Keys</h2>

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
                <div key={k.id} className={cn('p-3 rounded-xl border flex items-center justify-between text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                  <div>
                    <div className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{k.name}</div>
                    <div className={cn('font-mono text-[11px]', isDark ? 'text-zinc-400' : 'text-slate-500')}>{k.accessKey}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-100 text-cyan-800')}>{k.permission}</span>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', k.isActive ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700'))}>
                      {k.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    <button onClick={() => handleDeleteKey(k.id)} className={cn('p-1 cursor-pointer', isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700')}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cn('lg:col-span-6 rounded-2xl border p-5 space-y-3', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>AWS CLI &amp; SDK Configuration</h2>
            <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-slate-600')}>Use any standard AWS S3 SDK or CLI with your dynamic endpoint:</p>
            <pre className={cn('p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-300' : 'bg-slate-900 border-slate-800 text-cyan-300')}>{`# AWS CLI Example
export AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
aws s3 ls s3://${selectedBucket || 'your-bucket'} \\
  --endpoint-url ${publicEndpoint || 'https://your-s3-endpoint'}

# Node.js (@aws-sdk/client-s3)
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "${publicEndpoint || 'https://your-s3-endpoint'}",
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});`}</pre>
          </div>
        </div>
      )}

      {/* Tab 3: Scale & Settings (Matching Managed DB Scale Modal UI) */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form onSubmit={handleSaveSettings} className={cn('lg:col-span-8 rounded-2xl border p-5 sm:p-6 space-y-5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            {/* Header matching DatabaseScaleModal */}
            <div className={cn('flex items-center gap-3 pb-4 border-b', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
                  isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-600'
                )}
              >
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className={cn('text-base font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
                  Scale &amp; Upgrade Object Storage
                </h2>
                <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                  Scale storage tier, bucket limits, and IAM key quotas with zero data loss.
                </p>
              </div>
            </div>

            {/* Current Allocation Callout */}
            <div
              className={cn(
                'p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs',
                isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
              )}
            >
              <div>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider block', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  Current Allocation ({service.name})
                </span>
                <span className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-slate-900')}>
                  {service.planName} • {service.storageGb} GB SSD
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('px-2.5 py-1 rounded-lg border font-mono font-bold', isDark ? 'bg-white/[0.03] border-white/10 text-cyan-300' : 'bg-white border-slate-200 text-slate-700')}>
                  {formatBytes(service.usedBytes || 0)} / {service.storageGb} GB used
                </span>
                <span className={cn('font-mono text-xs font-bold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
                  Rp {currentMonthly.toLocaleString('id-ID')}/mo
                </span>
              </div>
            </div>

            {/* Service Name */}
            <div>
              <label className={cn('block text-xs font-bold uppercase tracking-wider mb-2', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                Service Name
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={cn(
                  'w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500',
                  isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                )}
              />
            </div>

            {/* 1. Choose Storage Plan */}
            <div>
              <label className={cn('block text-xs font-bold uppercase tracking-wider mb-2', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                1. Choose Storage Plan (SSD Quota &amp; Limits)
              </label>

              {plans.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {plans.map((plan) => {
                    const isSelected = editStorageGb === plan.storageGb;
                    const isCurrent = service.storageGb === plan.storageGb;
                    const deltaGb = Math.max(0, plan.storageGb - service.storageGb);
                    const planHasCap = deltaGb === 0 || !capacity
                      ? true
                      : capacity.available && capacity.freeGb >= deltaGb;
                    const usedExceedsPlan = (service.usedBytes || 0) > plan.storageGb * 1024 * 1024 * 1024;
                    const bucketsExceedPlan = plan.maxBuckets !== undefined && plan.maxBuckets > 0 && (service.buckets?.length || 0) > plan.maxBuckets;
                    const keysExceedPlan = plan.maxKeys !== undefined && plan.maxKeys > 0 && (service.keys?.length || 0) > plan.maxKeys;
                    const isDisabled = !planHasCap || usedExceedsPlan || bucketsExceedPlan || keysExceedPlan;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setEditStorageGb(plan.storageGb)}
                        className={cn(
                          'p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between',
                          isDisabled
                            ? isDark
                              ? 'bg-[#0a0a0c]/50 border-white/[0.04] text-zinc-600 opacity-50 cursor-not-allowed'
                              : 'bg-slate-100 border-slate-200 text-slate-400 opacity-55 cursor-not-allowed'
                            : isSelected
                              ? isDark
                                ? 'bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-400/30 text-white cursor-pointer'
                                : 'bg-cyan-50 border-cyan-400 ring-1 ring-cyan-400/20 text-slate-950 cursor-pointer'
                              : isDark
                                ? 'bg-[#0a0a0c] border-white/[0.06] hover:border-white/20 text-zinc-300 cursor-pointer'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs cursor-pointer'
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs truncate">{plan.name}</span>
                            {isCurrent ? (
                              <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border', isDark ? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' : 'bg-slate-200 text-slate-600 border-slate-300')}>
                                Current
                              </span>
                            ) : !planHasCap ? (
                              <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border', isDark ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-red-50 text-red-600 border-red-200')}>
                                Full
                              </span>
                            ) : isSelected ? (
                              <Check className={cn('w-3.5 h-3.5 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-85">
                            <HardDrive className={cn('w-3 h-3 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                            <span>
                              {plan.storageGb} GB • {plan.maxBuckets === -1 ? '∞' : plan.maxBuckets ?? '-'} Buckets • {plan.maxKeys === -1 ? '∞' : plan.maxKeys ?? '-'} Keys
                            </span>
                          </div>
                        </div>
                        <div className={cn('mt-2.5 pt-2 border-t text-[11px] font-mono font-bold', isDark ? 'border-white/[0.06] text-cyan-400' : 'border-slate-200 text-cyan-600')}>
                          Rp {plan.monthlyPrice.toLocaleString('id-ID')}/mo
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={editStorageGb}
                  onChange={(e) => setEditStorageGb(parseInt(e.target.value || '1', 10))}
                  className={cn(
                    'w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500',
                    isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  )}
                />
              )}
            </div>

            {/* Zero Data Loss Guarantee Banner */}
            <div
              className={cn(
                'p-3 rounded-xl border flex items-start gap-2.5 text-xs',
                isDark
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              )}
            >
              <ShieldCheck className={cn('w-4 h-4 shrink-0 mt-0.5', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
              <p className="leading-snug">
                <strong>Zero Data Loss Guarantee:</strong> Your existing buckets, objects, and S3 IAM Access Keys remain completely intact. Storage quotas and bucket/key limits update immediately with zero downtime.
              </p>
            </div>

            {/* Pricing Breakdown & Balance Verification */}
            <div className={cn('p-4 rounded-xl border space-y-2 text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
              <div className="flex items-center justify-between">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>New Storage Plan Price:</span>
                <span className={cn('font-mono font-bold text-sm', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
                  Rp {newMonthlyPrice.toLocaleString('id-ID')}/mo (~Rp {newHourlyRate.toLocaleString('id-ID')}/hr)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>Current Monthly Burn:</span>
                <span className={cn('font-mono font-medium', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                  Rp {currentMonthly.toLocaleString('id-ID')}/mo
                </span>
              </div>
              <div className={cn('flex items-center justify-between border-t pt-2', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
                <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>Your Current Balance:</span>
                <span className={cn('font-mono font-bold', isScaleBalanceInsufficient ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600'))}>
                  {loadingBilling ? '...' : `Rp ${userBalance.toLocaleString('id-ID')}`}
                </span>
              </div>
              {isUpgradePrice && (
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>Required Commitment Balance:</span>
                  <span className={cn('font-mono font-bold', isScaleBalanceInsufficient ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-cyan-400' : 'text-cyan-600'))}>
                    Rp {requiredBalance.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            {isScaleBalanceInsufficient && (
              <div className={cn('p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2', isDark ? 'bg-red-500/15 border-red-500/35 text-red-200' : 'bg-red-50 border-red-300 text-red-900')}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn('w-4 h-4 shrink-0', isDark ? 'text-red-400' : 'text-red-600')} />
                  <span>
                    Insufficient balance for upgrade. Shortfall: <strong>Rp {scaleShortfall.toLocaleString('id-ID')}</strong>
                  </span>
                </div>
                <Link href="/dashboard/topup" className={cn('font-bold underline shrink-0', isDark ? 'text-red-300 hover:text-white' : 'text-red-700 hover:text-red-950')}>
                  Top Up Balance →
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={savingSettings || isScaleUnchanged || isScaleBalanceInsufficient || !hasScaleClusterCapacity}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying Changes...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>{editStorageGb !== service.storageGb ? 'Upgrade & Apply Plan' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </form>

          <div className={cn('lg:col-span-4 rounded-2xl border p-5 space-y-3', isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50')}>
            <h2 className={cn('text-sm font-bold', isDark ? 'text-red-400' : 'text-red-700')}>Danger Zone</h2>
            <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-red-800')}>
              Terminating permanently deletes all buckets, objects, and S3 Access Keys from Customer RustFS and stops hourly billing.
            </p>
            <button onClick={handleTerminate} disabled={terminating} className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white cursor-pointer transition-colors">
              {terminating ? 'Terminating...' : 'Terminate Object Storage'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
