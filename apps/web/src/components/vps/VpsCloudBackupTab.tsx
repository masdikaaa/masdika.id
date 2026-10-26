"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  CloudUpload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Trash2,
  HardDrive,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Server,
  Folder,
  Key,
  Database,
  ArrowUpRight,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";

interface VpsCloudBackupTabProps {
  vps: any;
  isDark: boolean;
}

interface BackupRecord {
  id: number;
  configId: number | null;
  provider: string;
  filename: string;
  fileSize: number;
  targetKey: string;
  downloadUrl: string | null;
  status: "COMPLETED" | "FAILED" | "CREATING_BACKUP" | "UPLOADING_TO_CLOUD" | "PREPARING";
  progress?: number;
  stageText?: string | null;
  error: string | null;
  createdAt: string;
}

interface CloudConfig {
  id?: number;
  provider: "R2" | "S3" | "GDRIVE";
  enabled: boolean;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  hasSecretKey?: boolean;
  pathPrefix?: string | null;
  gdriveFolderId?: string | null;
  gdriveClientEmail?: string | null;
  gdrivePrivateKey?: string | null;
  hasPrivateKey?: boolean;
  autoSchedule?: string | null;
  lastBackupAt?: string | null;
  lastStatus?: string | null;
  lastError?: string | null;
}

const AWS_REGIONS = [
  { value: "ap-southeast-3", label: "Asia Pacific (Jakarta) - ap-southeast-3" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore) - ap-southeast-1" },
  { value: "us-east-1", label: "US East (N. Virginia) - us-east-1" },
  { value: "us-west-2", label: "US West (Oregon) - us-west-2" },
  { value: "eu-central-1", label: "Europe (Frankfurt) - eu-central-1" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo) - ap-northeast-1" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai) - ap-south-1" },
  { value: "auto", label: "Auto / Other" }
];

export function VpsCloudBackupTab({ vps, isDark }: VpsCloudBackupTabProps) {
  const vpsId = vps?.id;
  const vmid = vps?.vmid;
  const vpsStatus = vps?.status;

  const [selectedProvider, setSelectedProvider] = useState<"R2" | "S3" | "GDRIVE">("R2");
  const [config, setConfig] = useState<CloudConfig>({
    provider: "R2",
    enabled: true,
    endpoint: "",
    bucket: "",
    region: "auto",
    accessKeyId: "",
    secretAccessKey: "",
    pathPrefix: `vps-${vmid || vpsId || "backup"}`,
    gdriveFolderId: "",
    gdriveClientEmail: "",
    gdrivePrivateKey: ""
  });

  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<BackupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (quiet = false) => {
    if (!vpsId) return;
    if (!quiet) setIsLoading(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/cloud-backups`);
      const data = await res.json();

      if (data.success) {
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
            // Keep user typed input if unmasked
            secretAccessKey: data.config.hasSecretKey ? "••••••••••••••••" : "",
            gdrivePrivateKey: data.config.hasPrivateKey ? "••••••••••••••••" : ""
          }));
          if (data.config.provider) {
            setSelectedProvider(data.config.provider);
          }
        }
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error("Failed to fetch cloud backups:", err);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [vpsId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if any backup is in progress
  const activeBackup = records.find(
    (r) => r.status === "CREATING_BACKUP" || r.status === "UPLOADING_TO_CLOUD" || r.status === "PREPARING"
  );

  // Auto poll every 4 seconds while active backup is running
  useEffect(() => {
    if (!activeBackup) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeBackup, fetchData]);

  // Handle provider switch
  const handleSelectProvider = (prov: "R2" | "S3" | "GDRIVE") => {
    setSelectedProvider(prov);
    setConfig((prev) => ({
      ...prev,
      provider: prov,
      region: prov === "S3" ? (prev.region && prev.region !== "auto" ? prev.region : "ap-southeast-3") : "auto"
    }));
    setTestResult(null);
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!vpsId) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/cloud-backups/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          provider: selectedProvider
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        toast.success(data.message);
      } else {
        setTestResult({ success: false, message: data.message || "Connection failed" });
        toast.error(data.message || "Connection failed");
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to test connection";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  // Save config
  const handleSaveConfig = async () => {
    if (!vpsId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/cloud-backups/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          provider: selectedProvider,
          testNow: false
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cloud storage configuration saved successfully");
        if (data.config) {
          setConfig((prev) => ({
            ...prev,
            ...data.config,
            secretAccessKey: data.config.hasSecretKey ? "••••••••••••••••" : "",
            gdrivePrivateKey: data.config.hasPrivateKey ? "••••••••••••••••" : ""
          }));
        }
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (err: any) {
      toast.error(err?.message || "Network error while saving");
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Backup
  const handleRunBackup = async () => {
    if (!vpsId) return;
    if (activeBackup) {
      toast.info("A backup is already running. Please wait for it to complete.");
      return;
    }

    setIsBackingUp(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/cloud-backups/run`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cloud backup initiated! vzdump snapshot is being prepared.");
        fetchData(true);
      } else {
        toast.error(data.error || "Failed to start cloud backup");
      }
    } catch (err: any) {
      toast.error(err?.message || "Network error");
    } finally {
      setIsBackingUp(false);
    }
  };

  // Confirm delete
  const handleDeleteRecord = async () => {
    if (!recordToDelete || !vpsId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/cloud-backups/${recordToDelete.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Backup deleted from cloud storage");
        setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
        setDeleteModalOpen(false);
        setRecordToDelete(null);
      } else {
        toast.error(data.error || "Failed to delete backup");
      }
    } catch (err: any) {
      toast.error(err?.message || "Network error");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Top Banner & Overview */}
      <div
        className={cn(
          "border rounded-2xl p-6 shadow-lg relative overflow-hidden transition-all",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <CloudUpload className="w-5 h-5" />
              </div>
              <h3 className={cn("text-lg font-semibold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Cloud Storage Backup (Bring Your Own Storage)
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Free Feature
              </span>
            </div>
            <p className={cn("text-sm max-w-2xl", isDark ? "text-zinc-400" : "text-slate-600")}>
              Backup this entire virtual machine directly to your personal cloud storage without consuming local Proxmox storage quota. Supported providers: Cloudflare R2, AWS S3, and Google Drive.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              title="Refresh records"
              className={cn(
                "p-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-50",
                isDark
                  ? "bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>

            <button
              onClick={handleRunBackup}
              disabled={isBackingUp || Boolean(activeBackup) || vpsStatus === "SUSPENDED"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 font-semibold text-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
            >
              <CloudUpload className={cn("w-4 h-4", isBackingUp && "animate-bounce")} />
              {activeBackup ? "Backup In Progress..." : isBackingUp ? "Starting Backup..." : "Backup Now to Cloud"}
            </button>
          </div>
        </div>

        {/* Active Backup Progress Bar & Live Status */}
        {activeBackup && (() => {
          const progressPct = Math.max(5, Math.min(100, activeBackup.progress || (activeBackup.status === "UPLOADING_TO_CLOUD" ? 60 : 20)));
          return (
            <div
              className={cn(
                "mt-5 p-5 rounded-2xl border transition-all relative overflow-hidden",
                isDark
                  ? "bg-slate-900/90 border-cyan-500/40 shadow-[0_4px_28px_rgba(34,211,238,0.14)]"
                  : "bg-cyan-50/70 border-cyan-300 shadow-sm"
              )}
            >
              {/* Header: Stage info + Live Percentage Counter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {activeBackup.status === "CREATING_BACKUP" ? "Step 1/2: Snapshot" : "Step 2/2: Cloud Upload"}
                      </span>
                      <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                      <span className="text-xs text-slate-400 font-mono truncate hidden sm:inline" title={activeBackup.filename}>
                        {activeBackup.filename}
                      </span>
                    </div>
                    <h5 className={cn("text-sm font-semibold tracking-tight mt-1 truncate", isDark ? "text-white" : "text-slate-900")}>
                      {activeBackup.stageText ||
                        (activeBackup.status === "CREATING_BACKUP"
                          ? "Proxmox is creating VM disk snapshot archive..."
                          : `Streaming backup archive directly to ${activeBackup.provider}...`)}
                    </h5>
                  </div>
                </div>

                {/* Big Live Percentage Display */}
                <div className="flex items-baseline gap-1.5 self-end sm:self-center shrink-0">
                  <span className="text-3xl font-extrabold text-cyan-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                    {progressPct}%
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Done</span>
                </div>
              </div>

              {/* Glowing Progress Bar Track */}
              <div className="w-full h-3 sm:h-3.5 bg-black/40 rounded-full overflow-hidden border border-white/10 relative p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_14px_rgba(34,211,238,0.6)] relative overflow-hidden"
                  style={{ width: `${progressPct}%` }}
                >
                  {/* Subtle animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[pulse_2s_infinite]" />
                </div>
              </div>

              {/* Sub-details telemetries */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 mt-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                  </span>
                  <span>Streaming directly to {activeBackup.provider} (Zero-RAM pipe)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Compressed vzdump archive • Auto-cleaning local storage
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Storage Provider Selection & Settings Card */}
      <div
        className={cn(
          "border rounded-2xl p-6 shadow-lg transition-all",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="mb-6">
          <h4 className={cn("text-base font-semibold mb-1", isDark ? "text-white" : "text-slate-900")}>
            Storage Provider Configuration
          </h4>
          <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            Select your preferred cloud storage provider and enter your API credentials.
          </p>
        </div>

        {/* Provider Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {/* Cloudflare R2 */}
          <button
            type="button"
            onClick={() => handleSelectProvider("R2")}
            className={cn(
              "p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 relative",
              selectedProvider === "R2"
                ? isDark
                  ? "bg-orange-500/10 border-orange-500/50 text-white shadow-sm ring-1 ring-orange-500/30"
                  : "bg-orange-50/70 border-orange-500 text-slate-900 ring-1 ring-orange-500/30"
                : isDark
                ? "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 font-bold text-xs">
              R2
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-1.5">
                Cloudflare R2
                {config.provider === "R2" && config.hasSecretKey && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Configured" />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Zero egress fees, S3 compatible</p>
            </div>
          </button>

          {/* AWS S3 */}
          <button
            type="button"
            onClick={() => handleSelectProvider("S3")}
            className={cn(
              "p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 relative",
              selectedProvider === "S3"
                ? isDark
                  ? "bg-amber-500/10 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/30"
                  : "bg-amber-50/70 border-amber-500 text-slate-900 ring-1 ring-amber-500/30"
                : isDark
                ? "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs">
              S3
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-1.5">
                Amazon AWS S3
                {config.provider === "S3" && config.hasSecretKey && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Configured" />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Industry standard object storage</p>
            </div>
          </button>

          {/* Google Drive */}
          <button
            type="button"
            onClick={() => handleSelectProvider("GDRIVE")}
            className={cn(
              "p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 relative",
              selectedProvider === "GDRIVE"
                ? isDark
                  ? "bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/30"
                  : "bg-emerald-50/70 border-emerald-500 text-slate-900 ring-1 ring-emerald-500/30"
                : isDark
                ? "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
              GD
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-1.5">
                Google Drive
                {config.provider === "GDRIVE" && config.hasPrivateKey && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Configured" />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Personal or Shared Drive folder</p>
            </div>
          </button>
        </div>

        {/* Provider Settings Form */}
        <div className="space-y-4">
          {/* Cloudflare R2 Form */}
          {selectedProvider === "R2" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Cloudflare Account ID or Endpoint URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 78a1b2c3d4e5f6... or https://<account_id>.r2.cloudflarestorage.com"
                  value={config.endpoint || ""}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                    isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Found in Cloudflare Dashboard &gt; R2 &gt; Overview &gt; Account ID.
                </p>
              </div>

              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Bucket Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. my-vps-backups"
                  value={config.bucket || ""}
                  onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                    isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Subfolder / Prefix (Optional)
                </label>
                <input
                  type="text"
                  placeholder={`vps-${vmid || vpsId || "backup"}`}
                  value={config.pathPrefix || ""}
                  onChange={(e) => setConfig({ ...config, pathPrefix: e.target.value })}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                    isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Access Key ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="R2 API Token Access Key ID"
                  value={config.accessKeyId || ""}
                  onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                    isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Secret Access Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    placeholder={config.hasSecretKey ? "•••••••••••••••• (Leave blank to keep saved key)" : "Enter Secret Access Key"}
                    value={config.secretAccessKey || ""}
                    onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                    className={cn(
                      "w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AWS S3 Form */}
          {selectedProvider === "S3" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  AWS Region <span className="text-red-400">*</span>
                </label>
                <Select
                  value={config.region || "ap-southeast-3"}
                  onChange={(val) => setConfig({ ...config, region: val })}
                  options={AWS_REGIONS}
                  className={cn(
                    "w-full px-3.5 py-2 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                    isDark ? "bg-slate-900/60 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Bucket Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. my-vps-backups-bucket"
                  value={config.bucket || ""}
                  onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                    isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Access Key ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="AKIA..."
                  value={config.accessKeyId || ""}
                  onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                    isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Secret Access Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    placeholder={config.hasSecretKey ? "•••••••••••••••• (Leave blank to keep saved key)" : "Enter Secret Access Key"}
                    value={config.secretAccessKey || ""}
                    onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                    className={cn(
                      "w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                  Subfolder / Prefix (Optional)
                </label>
                <input
                  type="text"
                  placeholder={`vps-${vmid || vpsId || "backup"}`}
                  value={config.pathPrefix || ""}
                  onChange={(e) => setConfig({ ...config, pathPrefix: e.target.value })}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                    isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>
            </div>
          )}

          {/* Google Drive Form */}
          {selectedProvider === "GDRIVE" && (
            <div className="space-y-4">
              <div className={cn("p-4 rounded-xl border text-xs leading-relaxed", isDark ? "bg-slate-900/40 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                <div className="flex items-center gap-2 font-semibold text-cyan-400 mb-1">
                  <Info className="w-4 h-4" /> How to connect Google Drive:
                </div>
                1. In Google Cloud Console, create a Service Account with Google Drive API enabled.<br />
                2. Generate and download a JSON key.<br />
                3. Share your target Google Drive folder with the Service Account email giving it <strong>Editor</strong> permission.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                    Google Drive Folder ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1A2b3C4d5E6f7G8h9I..."
                    value={config.gdriveFolderId || ""}
                    onChange={(e) => setConfig({ ...config, gdriveFolderId: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                  <p className="text-xs text-slate-500 mt-1">Copy the ID from your browser URL: drive.google.com/drive/folders/<strong>[ID]</strong></p>
                </div>

                <div>
                  <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                    Service Account Client Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="my-backup-bot@project-id.iam.gserviceaccount.com"
                    value={config.gdriveClientEmail || ""}
                    onChange={(e) => setConfig({ ...config, gdriveClientEmail: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-700")}>
                    Service Account Private Key (RSA) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      placeholder={config.hasPrivateKey ? "-----BEGIN PRIVATE KEY-----\n••••••••••••••••••••••••••••••••••••••••••••••••\n(Leave blank to keep saved key)" : "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                      value={config.gdrivePrivateKey || ""}
                      onChange={(e) => setConfig({ ...config, gdrivePrivateKey: e.target.value })}
                      className={cn(
                        "w-full px-3.5 py-2 rounded-xl border text-xs font-mono transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                        isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Result Message */}
          {testResult && (
            <div
              className={cn(
                "p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in",
                testResult.success
                  ? isDark
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : isDark
                  ? "bg-red-500/10 border-red-500/20 text-red-300"
                  : "bg-red-50 border-red-200 text-red-800"
              )}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className={cn(
                "px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50",
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-800 text-white border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isTesting && "animate-spin")} />
              {isTesting ? "Testing Connection..." : "Test Connection"}
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving || isTesting}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isSaving ? "Saving Settings..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Backups Table */}
      <div
        className={cn(
          "border rounded-2xl p-6 shadow-lg transition-all",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className={cn("text-base font-semibold", isDark ? "text-white" : "text-slate-900")}>
              Your Cloud Backups ({records.length})
            </h4>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
              Archives stored directly on your personal cloud storage.
            </p>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800/80">
            <Cloud className="w-10 h-10 mx-auto text-slate-500 mb-3 opacity-60" />
            <h5 className={cn("font-medium text-sm mb-1", isDark ? "text-white" : "text-slate-800")}>
              No Cloud Backups Yet
            </h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Configure your cloud credentials above and click &quot;Backup Now to Cloud&quot; to create your first free offsite backup.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/60">
            <table className="w-full text-left text-sm">
              <thead className={cn("text-xs font-semibold uppercase tracking-wider border-b", isDark ? "bg-slate-900/60 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
                <tr>
                  <th className="px-4 py-3.5">Backup Archive</th>
                  <th className="px-4 py-3.5">Storage</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5">Date Created</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {records.map((rec) => (
                  <tr
                    key={rec.id}
                    className={cn(
                      "transition-colors",
                      isDark ? "hover:bg-slate-900/40" : "hover:bg-slate-50"
                    )}
                  >
                    <td className="px-4 py-3.5 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className={cn("font-medium truncate max-w-[240px]", isDark ? "text-slate-200" : "text-slate-800")} title={rec.filename}>
                          {rec.filename}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border",
                          rec.provider === "R2"
                            ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            : rec.provider === "S3"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        {rec.provider === "R2" ? "Cloudflare R2" : rec.provider === "S3" ? "AWS S3" : "Google Drive"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-xs font-mono text-slate-400">
                      {formatFileSize(rec.fileSize)}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {new Date(rec.createdAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5">
                      {rec.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : rec.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400" title={rec.error || "Failed"}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rec.status === "COMPLETED" && (
                          <a
                            href={`/api/user/vps/${vpsId}/cloud-backups/${rec.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                              isDark
                                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
                                : "bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100"
                            )}
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        )}

                        <button
                          onClick={() => {
                            setRecordToDelete(rec);
                            setDeleteModalOpen(true);
                          }}
                          className={cn(
                            "p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          )}
                          title="Delete from cloud storage"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={handleDeleteRecord}
        title="Delete Cloud Backup"
        description={`Are you sure you want to delete "${recordToDelete?.filename}" from your ${recordToDelete?.provider} storage? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Permanently"}
        variant="danger"
      />
    </div>
  );
}
