'use client';

import { useState, useEffect, use } from 'react';
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
  RefreshCw,
} from 'lucide-react';

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
  const [savingSettings, setSavingSettings] = useState(false);
  const [terminating, setTerminating] = useState(false);

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
      toast.success('Service updated');
      fetchService();
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
        <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-zinc-400">Object Storage service not found.</p>
        <Link href="/dashboard/object-storage" className="text-indigo-400 text-xs font-bold">
          Back to Object Storage
        </Link>
      </div>
    );
  }

  const activeBucketObj = service.buckets?.find((b: any) => b.name === selectedBucket);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/object-storage" className={cn('p-2 rounded-xl border', isDark ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-white border-slate-200 text-slate-700')}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{service.name}</h1>
              <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border', service.status === 'SUSPENDED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')}>
                {service.status === 'SUSPENDED' ? 'Suspended (Grace Period 3 Hari)' : service.status}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {service.planName} • {formatBytes(service.usedBytes || 0)} / {service.storageGb} GB used • Rp {service.hourlyRate.toLocaleString('id-ID')}/hr
            </p>
          </div>
        </div>

        {publicEndpoint && (
          <div className={cn('px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-slate-200')}>
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <code className="font-mono text-indigo-400">{publicEndpoint}</code>
            <button onClick={() => { navigator.clipboard.writeText(publicEndpoint); toast.success('Copied!'); }} className="text-zinc-400 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {service.status === 'SUSPENDED' && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Service suspended due to insufficient balance (3-day grace period). Top up your wallet to automatically re-enable your S3 keys.</span>
          </div>
          <Link href="/dashboard/billing" className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold shrink-0 text-center">
            Top Up Now
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-3">
        {[
          { id: 'buckets', label: 'Buckets & Objects', icon: Database },
          { id: 'keys', label: 'IAM Access Keys & SDK', icon: KeyRound },
          { id: 'settings', label: 'Scale & Settings', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
                tab === t.id
                  ? 'bg-indigo-500 text-white'
                  : isDark
                    ? 'bg-white/[0.04] text-zinc-400 hover:text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
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
          <div className={cn('lg:col-span-4 rounded-2xl border p-4 space-y-4', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-slate-200')}>
            <div className="flex items-center justify-between">
              <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>S3 Buckets</h2>
              <span className="text-[11px] text-zinc-500">{service.buckets?.length || 0} total</span>
            </div>

            <form onSubmit={handleCreateBucket} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value.toLowerCase())}
                  placeholder="new-bucket-name"
                  className={cn('flex-1 rounded-xl px-3 py-2 text-xs border focus:outline-none focus:border-indigo-500', isDark ? 'bg-[#111115] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
                />
                <select value={newBucketVis} onChange={(e) => setNewBucketVis(e.target.value as any)} className={cn('rounded-xl px-2 py-2 text-xs border', isDark ? 'bg-[#111115] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}>
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </div>
              <button type="submit" disabled={creatingBucket || !newBucketName.trim() || service.status === 'SUSPENDED'} className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
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
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : isDark
                        ? 'border-white/[0.06] bg-[#111115] hover:border-white/20'
                        : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-xs font-bold truncate', isDark ? 'text-white' : 'text-slate-900')}>{b.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleBucketVis(b.name, b.visibility)}
                        title="Toggle Public/Private ACL"
                        className={cn('px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1', b.visibility === 'PUBLIC' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}
                      >
                        {b.visibility === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {b.visibility}
                      </button>
                      <button onClick={() => handleDeleteBucket(b.name)} className="text-zinc-500 hover:text-red-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex justify-between">
                    <span>{b.objectCount ?? 0} objects</span>
                    <span>{formatBytes(b.totalBytes ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Object Browser */}
          <div className={cn('lg:col-span-8 rounded-2xl border p-4 space-y-4', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-slate-200')}>
            {!selectedBucket ? (
              <div className="py-16 text-center text-xs text-zinc-500">Select or create a bucket to browse objects.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
                    <button onClick={() => setPrefix('')} className="text-indigo-400 font-bold hover:underline">{selectedBucket}</button>
                    {prefix.split('/').filter(Boolean).map((seg, i, arr) => {
                      const pathUpTo = arr.slice(0, i + 1).join('/') + '/';
                      return (
                        <span key={pathUpTo} className="flex items-center gap-1">
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                          <button onClick={() => setPrefix(pathUpTo)} className="text-zinc-300 hover:text-white">{seg}</button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => fetchObjects(selectedBucket, prefix)} className={cn('p-2 rounded-xl border', isDark ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-slate-50 border-slate-200')}>
                      <RefreshCw className={cn('w-3.5 h-3.5', loadingObjects && 'animate-spin')} />
                    </button>
                    <label className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white flex items-center gap-1.5 cursor-pointer">
                      <UploadCloud className="w-3.5 h-3.5" /> Upload Object
                      <input type="file" onChange={handleUploadObject} className="hidden" disabled={service.status === 'SUSPENDED'} />
                    </label>
                  </div>
                </div>

                {activeBucketObj?.visibility === 'PUBLIC' && publicEndpoint && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                    Public Bucket URL base: <code className="font-mono">{publicEndpoint}/{selectedBucket}/&lt;object-key&gt;</code>
                  </div>
                )}

                {loadingObjects ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
                ) : folders.length === 0 && objects.length === 0 ? (
                  <div className="py-16 text-center text-xs text-zinc-500">This bucket prefix is empty. Upload an object or use any S3 SDK.</div>
                ) : (
                  <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden">
                    {folders.map((f) => (
                      <div key={f} onClick={() => setPrefix(f)} className={cn('p-3 flex items-center justify-between cursor-pointer text-xs', isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50')}>
                        <div className="flex items-center gap-2.5 font-semibold text-amber-400">
                          <Folder className="w-4 h-4" /> {f.slice(prefix.length)}
                        </div>
                      </div>
                    ))}
                    {objects.map((obj) => (
                      <div key={obj.key} className={cn('p-3 flex items-center justify-between gap-3 text-xs', isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50')}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <File className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className={cn('truncate font-mono', isDark ? 'text-zinc-200' : 'text-slate-800')}>{obj.key.slice(prefix.length)}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-zinc-500">{formatBytes(obj.size)}</span>
                          <button onClick={() => handlePresign(obj.key)} title="Copy Presigned URL" className="text-cyan-400 hover:text-cyan-300 p-1"><Link2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteObject(obj.key)} title="Delete Object" className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
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
          <div className={cn('lg:col-span-6 rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-slate-200')}>
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Isolated S3 IAM Access Keys</h2>

            {revealedCred && (
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs space-y-1.5 font-mono">
                <div className="font-sans font-bold text-emerald-400">Copy Secret Key now (shown once):</div>
                <div className="text-cyan-300 break-all">Access Key: {revealedCred.accessKey}</div>
                <div className="text-emerald-300 break-all">Secret Key: {revealedCred.secretKey}</div>
              </div>
            )}

            <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. backend-app)"
                className={cn('flex-1 rounded-xl px-3 py-2 text-xs border', isDark ? 'bg-[#111115] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
              />
              <select value={newKeyPerm} onChange={(e) => setNewKeyPerm(e.target.value as any)} className={cn('rounded-xl px-3 py-2 text-xs border', isDark ? 'bg-[#111115] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}>
                <option value="READ_WRITE">Read &amp; Write</option>
                <option value="READ_ONLY">Read Only</option>
              </select>
              <button type="submit" disabled={creatingKey || !newKeyName.trim()} className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-50 cursor-pointer">
                {creatingKey ? 'Creating...' : 'Create Key'}
              </button>
            </form>

            <div className="space-y-2">
              {(service.keys || []).map((k: any) => (
                <div key={k.id} className={cn('p-3 rounded-xl border flex items-center justify-between text-xs', isDark ? 'bg-[#111115] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                  <div>
                    <div className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{k.name}</div>
                    <div className="font-mono text-zinc-400 text-[11px]">{k.accessKey}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 text-[10px] font-bold">{k.permission}</span>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', k.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}>
                      {k.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    <button onClick={() => handleDeleteKey(k.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cn('lg:col-span-6 rounded-2xl border p-5 space-y-3', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-slate-200')}>
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>AWS CLI &amp; SDK Configuration</h2>
            <p className="text-xs text-zinc-400">Use any standard AWS S3 SDK or CLI with your dynamic endpoint:</p>
            <pre className="p-3.5 rounded-xl bg-black/70 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed">{`# AWS CLI Example
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

      {/* Tab 3: Settings & Danger Zone */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form onSubmit={handleSaveSettings} className={cn('rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-slate-200')}>
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>Scale Storage &amp; Rename</h2>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Service Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={cn('w-full rounded-xl px-3.5 py-2 text-xs border', isDark ? 'bg-[#111115] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Storage Quota (GB)</label>
              <input type="number" min={10} max={10000} value={editStorageGb} onChange={(e) => setEditStorageGb(parseInt(e.target.value || '10', 10))} className={cn('w-full rounded-xl px-3.5 py-2 text-xs border', isDark ? 'bg-[#111115] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')} />
              <p className="text-[11px] text-zinc-500 mt-1">New rate: Rp {(editStorageGb * ratePerGb).toLocaleString('id-ID')}/mo</p>
            </div>
            <button type="submit" disabled={savingSettings} className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer">
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          <div className={cn('rounded-2xl border border-red-500/30 p-5 space-y-3', isDark ? 'bg-red-500/5' : 'bg-red-50')}>
            <h2 className="text-sm font-bold text-red-400">Danger Zone</h2>
            <p className="text-xs text-zinc-400">Terminating permanently deletes all buckets, objects, and S3 Access Keys from Customer RustFS and stops hourly billing.</p>
            <button onClick={handleTerminate} disabled={terminating} className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white cursor-pointer">
              {terminating ? 'Terminating...' : 'Terminate Object Storage'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
