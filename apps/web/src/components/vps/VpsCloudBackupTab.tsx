"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Info,
  Lock,
  Copy,
  Sparkles,
  Zap,
  X,
  Check,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw
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
  provider: "R2" | "S3";
  enabled: boolean;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  hasSecretKey?: boolean;
  pathPrefix?: string | null;
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

// Official Original Provider Vector Logos
function CloudflareLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#F38020"
        d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268z"
      />
      <path
        fill="#FAAD3F"
        d="M19.2656 11.2813c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727"
      />
    </svg>
  );
}

function AwsS3Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="-27 0 310 310" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
      <path d="M20.624 53.686L0 64v181.02l20.624 10.254.124-.149V53.828l-.124-.142" fill="#8C3123"/>
      <path d="M131 229L20.624 255.274V53.686L131 79.387V229" fill="#E05243"/>
      <path d="M81.178 187.866l46.818 5.96.294-.678.263-76.77-.557-.6-46.818 5.874v66.214" fill="#8C3123"/>
      <path d="M127.996 229.295l107.371 26.035.169-.269-.003-201.195-.17-.18-107.367 25.996v149.613" fill="#8C3123"/>
      <path d="M174.827 187.866l-46.831 5.96v-78.048l46.831 5.874v66.214" fill="#E05243"/>
      <path d="M174.827 89.631l-46.831 8.535-46.818-8.535 46.759-12.256 46.89 12.256" fill="#5E1F18"/>
      <path d="M174.827 219.801l-46.831-8.591-46.818 8.591 46.761 13.053 46.888-13.053" fill="#F2B0A9"/>
      <path d="M81.178 89.631l46.818-11.586.379-.117V.313L127.996 0 81.178 23.413v66.218" fill="#8C3123"/>
      <path d="M174.827 89.631l-46.831-11.586V0l46.831 23.413v66.218" fill="#E05243"/>
      <path d="M127.996 309.428l-46.823-23.405v-66.217l46.823 11.582.689.783-.187 75.906-.502 1.351" fill="#8C3123"/>
      <path d="M127.996 309.428l46.827-23.405v-66.217l-46.827 11.582v78.04M235.367 53.686L256 64v181.02l-20.633 10.31V53.686" fill="#E05243"/>
    </svg>
  );
}


interface SetupStep {
  step: number;
  text: React.ReactNode;
}

function CloudSetupGuide({
  title,
  steps,
  notice,
  isDark,
}: {
  title: string;
  steps: SetupStep[];
  notice?: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className={cn(
        "p-3.5 sm:p-4 rounded-xl border text-xs relative overflow-hidden transition-all",
        isDark ? "bg-[#060b14]/70 border-slate-800/80" : "bg-slate-50 border-slate-300"
      )}
    >
      <div className={cn("flex items-center gap-2 font-bold mb-3 text-xs sm:text-sm", isDark ? "text-cyan-400" : "text-cyan-800")}>
        <Info className="w-4 h-4 shrink-0" />
        <span>{title}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
        {steps.map((s) => (
          <div
            key={s.step}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all h-full min-h-[64px]",
              isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-300 shadow-2xs"
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs leading-none shrink-0 select-none shadow-2xs",
                isDark
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-cyan-100 text-cyan-950 border border-cyan-400 font-bold"
              )}
            >
              <span className="inline-flex items-center justify-center leading-none text-center">{s.step}</span>
            </div>
            <div className={cn("text-xs leading-snug flex-1 font-medium", isDark ? "text-slate-300" : "text-slate-900")}>
              {s.text}
            </div>
          </div>
        ))}
      </div>
      {notice && notice}
    </div>
  );
}

export function VpsCloudBackupTab({ vps, isDark }: VpsCloudBackupTabProps) {
  const vpsId = vps?.id;
  const vmid = vps?.vmid;
  const vpsStatus = vps?.status;

  const [selectedProvider, setSelectedProvider] = useState<"R2" | "S3">("R2");
  const [config, setConfig] = useState<CloudConfig>({
    provider: "R2",
    enabled: true,
    endpoint: "",
    bucket: "",
    region: "auto",
    accessKeyId: "",
    secretAccessKey: "",
    pathPrefix: `vps-${vmid || vpsId || "backup"}`
  });

  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Pagination for cloud backup records
  const [backupPage, setBackupPage] = useState(1);
  const backupPageSize = 5;
  const totalBackupPages = Math.max(1, Math.ceil(records.length / backupPageSize));
  const paginatedRecords = records.slice((backupPage - 1) * backupPageSize, backupPage * backupPageSize);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<BackupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; provider: string; error: string } | null>(null);
  const prevActiveIdRef = useRef<number | null>(null);

  // Confirm backup modal state
  const [isConfirmBackupOpen, setIsConfirmBackupOpen] = useState(false);

  // Success popup modal state
  const [successModalRecord, setSuccessModalRecord] = useState<BackupRecord | null>(null);

  // Restore modal state
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [recordToRestore, setRecordToRestore] = useState<BackupRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (quiet = false) => {
    if (!vpsId) return;
    if (!quiet) setIsLoading(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/cloud-backups`);
      const data = await res.json();

      if (data.success) {
        if (data.config) {
          const prov = (data.config.provider === "S3" ? "S3" : "R2") as "R2" | "S3";
          setSelectedProvider(prov);
          setConfig((prev) => ({
            ...prev,
            ...data.config,
            provider: prov,
            secretAccessKey: data.config.hasSecretKey ? "••••••••••••••••" : ""
          }));
        }
        const newRecords: BackupRecord[] = data.records || [];
        setRecords(newRecords);

        // Auto-detect if a previously active backup failed
        const currentActive = newRecords.find(
          (r) => r.status === "CREATING_BACKUP" || r.status === "UPLOADING_TO_CLOUD" || r.status === "PREPARING"
        );

        if (prevActiveIdRef.current) {
          const finishedRec = newRecords.find((r) => r.id === prevActiveIdRef.current);
          if (finishedRec) {
            if (finishedRec.status === "COMPLETED") {
              setSuccessModalRecord(finishedRec);
            } else if (finishedRec.status === "FAILED") {
              setErrorModal({
                title: "Cloud Backup Failed",
                provider: finishedRec.provider,
                error: finishedRec.error || "The backup process stopped before completion."
              });
            }
          }
        }

        prevActiveIdRef.current = currentActive ? currentActive.id : null;
      }
    } catch (err) {
      console.error("Failed to fetch cloud backups:", err);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [vpsId, setErrorModal, setSuccessModalRecord]);

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
  const handleSelectProvider = (prov: "R2" | "S3") => {
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
            secretAccessKey: data.config.hasSecretKey ? "••••••••••••••••" : ""
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

    setIsConfirmBackupOpen(false);
    setIsBackingUp(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/cloud-backups/run`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cloud backup initiated! vzdump snapshot is being prepared.");
        if (data.record?.id) {
          prevActiveIdRef.current = data.record.id;
        }
        fetchData(true);
      } else {
        const errorMsg = data.error || "Failed to start cloud backup";
        toast.error(errorMsg);
        setErrorModal({
          title: "Failed to Start Cloud Backup",
          provider: selectedProvider,
          error: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Network error";
      toast.error(errorMsg);
      setErrorModal({
        title: "Failed to Start Cloud Backup",
        provider: selectedProvider,
        error: errorMsg
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Trigger Restore
  const handleRestoreBackup = async () => {
    if (!recordToRestore || !vpsId) return;
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/user/vps/${vpsId}/cloud-backups/${recordToRestore.id}/restore`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "VPS restore initiated successfully!");
        setIsRestoreModalOpen(false);
        setRecordToRestore(null);
        fetchData(true);
      } else {
        toast.error(data.error || "Failed to initiate VPS restore");
      }
    } catch (err: any) {
      toast.error(err?.message || "Network error while restoring");
    } finally {
      setIsRestoring(false);
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
          "border rounded-2xl p-4 sm:p-6 shadow-lg relative overflow-hidden transition-all",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <CloudUpload className="w-5 h-5" />
              </div>
              <h3 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Cloud Storage Backup (Bring Your Own Storage)
              </h3>
              <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                Free Feature
              </span>
            </div>
            <p className={cn("text-xs sm:text-sm max-w-2xl leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
              Backup this entire virtual machine directly to your personal cloud storage without consuming local Proxmox storage quota. Supported providers: Cloudflare R2 and AWS S3.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto pt-1 sm:pt-0">
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              title="Refresh records"
              className={cn(
                "h-10 w-10 sm:w-auto sm:px-3.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center shrink-0",
                isDark
                  ? "bg-[#060b14] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-cyan-600 dark:text-cyan-400")} />
              <span className="hidden sm:inline-block ml-2 text-xs">Refresh</span>
            </button>

            <button
              onClick={() => setIsConfirmBackupOpen(true)}
              disabled={isBackingUp || Boolean(activeBackup) || vpsStatus === "SUSPENDED"}
              className="flex-1 sm:flex-initial h-10 flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl transition-all disabled:opacity-50 font-semibold text-xs sm:text-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <CloudUpload className={cn("w-4 h-4 shrink-0", isBackingUp && "animate-bounce")} />
              <span>{activeBackup ? "Backup In Progress..." : isBackingUp ? "Starting Backup..." : "Backup Now to Cloud"}</span>
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
                  ? "bg-[#060b14] border-cyan-500/30 shadow-md"
                  : "bg-cyan-50/50 border-cyan-200 shadow-xs"
              )}
            >
              {/* Header: Stage info + Live Percentage Counter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                    isDark
                      ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-400"
                      : "bg-cyan-50 border-cyan-200/80 text-cyan-600"
                  )}>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                        isDark
                          ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/30"
                          : "bg-cyan-50 text-cyan-700 border-cyan-200/80"
                      )}>
                        {activeBackup.status === "CREATING_BACKUP" ? "Step 1/2: Snapshot" : "Step 2/2: Cloud Upload"}
                      </span>
                      <span className={cn("text-xs hidden sm:inline", isDark ? "text-slate-400" : "text-slate-500")}>•</span>
                      <span className={cn("text-xs font-mono truncate hidden sm:inline", isDark ? "text-slate-400" : "text-slate-600")} title={activeBackup.filename}>
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
                  <span className={cn(
                    "text-3xl font-extrabold font-mono tracking-tight",
                    isDark ? "text-cyan-400" : "text-cyan-600"
                  )}>
                    {progressPct}%
                  </span>
                  <span className={cn("text-[11px] font-bold uppercase", isDark ? "text-slate-400" : "text-slate-600")}>Done</span>
                </div>
              </div>

              {/* Glowing Progress Bar Track */}
              <div className={cn(
                "w-full h-3 sm:h-3.5 rounded-full overflow-hidden relative p-0.5 border",
                isDark ? "bg-black/40 border-white/5" : "bg-slate-100 border-slate-300"
              )}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-cyan-500 to-cyan-400 relative overflow-hidden"
                  style={{ width: `${progressPct}%` }}
                >
                  {/* Subtle animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[pulse_2s_infinite]" />
                </div>
              </div>

              {/* Sub-details telemetries */}
              <div className={cn(
                "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 mt-3 text-xs",
                isDark ? "text-zinc-400" : "text-slate-600"
              )}>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                  </span>
                  <span>Streaming directly to {activeBackup.provider} (Zero-RAM pipe)</span>
                </div>
                <span className={cn("text-[11px] font-mono", isDark ? "text-slate-400" : "text-slate-600")}>
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
          "border rounded-2xl p-4 sm:p-6 shadow-lg transition-all",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="mb-6">
          <h3 className={cn("text-base sm:text-lg font-bold mb-1", isDark ? "text-white" : "text-slate-950")}>
            Storage Provider Configuration
          </h3>
          <p className={cn("text-xs sm:text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
            Select your preferred cloud storage provider and enter your API credentials.
          </p>
        </div>

        {/* Provider Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {/* Cloudflare R2 */}
          <button
            type="button"
            onClick={() => handleSelectProvider("R2")}
            className={cn(
              "p-2.5 sm:p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 relative group cursor-pointer",
              selectedProvider === "R2"
                ? isDark
                  ? "bg-cyan-500/10 border-cyan-500/60 text-white shadow-[0_0_20px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/40"
                  : "bg-cyan-50/90 border-cyan-600 text-slate-950 ring-1 ring-cyan-600/40 shadow-xs"
                : isDark
                ? "bg-[#060b14]/70 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700/80 hover:bg-[#060b14]"
                : "bg-white border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-50 shadow-2xs"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all",
                  isDark
                    ? selectedProvider === "R2"
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-[#0b1322] border-slate-800 group-hover:border-slate-700"
                    : selectedProvider === "R2"
                    ? "bg-cyan-100/70 border-cyan-400"
                    : "bg-slate-50 border-slate-300"
                )}
              >
                <CloudflareLogo className="w-5 h-5 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className={cn("text-xs sm:text-sm flex items-center gap-1.5 truncate", selectedProvider === "R2" ? "font-bold text-slate-950 dark:text-white" : "font-semibold text-slate-800 dark:text-slate-300")}>
                  <span>Cloudflare R2</span>
                  {config.provider === "R2" && config.hasSecretKey && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Configured" />
                  )}
                </div>
                <p className={cn("text-[11px] sm:text-xs mt-0.5 truncate font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Zero egress fees, S3 API</p>
              </div>
            </div>

            {/* Selection indicator radio dot */}
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                selectedProvider === "R2"
                  ? "border-cyan-500 bg-cyan-500"
                  : isDark
                  ? "border-slate-700 bg-transparent"
                  : "border-slate-400 bg-white"
              )}
            >
              {selectedProvider === "R2" && <div className="w-1 h-1 rounded-full bg-white dark:bg-slate-950" />}
            </div>
          </button>

          {/* AWS S3 */}
          <button
            type="button"
            onClick={() => handleSelectProvider("S3")}
            className={cn(
              "p-2.5 sm:p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 relative group cursor-pointer",
              selectedProvider === "S3"
                ? isDark
                  ? "bg-cyan-500/10 border-cyan-500/60 text-white shadow-[0_0_20px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/40"
                  : "bg-cyan-50/90 border-cyan-600 text-slate-950 ring-1 ring-cyan-600/40 shadow-xs"
                : isDark
                ? "bg-[#060b14]/70 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700/80 hover:bg-[#060b14]"
                : "bg-white border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-50 shadow-2xs"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-all",
                  isDark
                    ? selectedProvider === "S3"
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-[#0b1322] border-slate-800 group-hover:border-slate-700"
                    : selectedProvider === "S3"
                    ? "bg-cyan-100/70 border-cyan-400"
                    : "bg-slate-50 border-slate-300"
                )}
              >
                <AwsS3Logo className="w-5 h-5 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className={cn("text-xs sm:text-sm flex items-center gap-1.5 truncate", selectedProvider === "S3" ? "font-bold text-slate-950 dark:text-white" : "font-semibold text-slate-800 dark:text-slate-300")}>
                  <span>Amazon AWS S3</span>
                  {config.provider === "S3" && config.hasSecretKey && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Configured" />
                  )}
                </div>
                <p className={cn("text-[11px] sm:text-xs mt-0.5 truncate font-medium", isDark ? "text-slate-400" : "text-slate-600")}>Industry standard storage</p>
              </div>
            </div>

            {/* Selection indicator radio dot */}
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                selectedProvider === "S3"
                  ? "border-cyan-500 bg-cyan-500"
                  : isDark
                  ? "border-slate-700 bg-transparent"
                  : "border-slate-400 bg-white"
              )}
            >
              {selectedProvider === "S3" && <div className="w-1 h-1 rounded-full bg-white dark:bg-slate-950" />}
            </div>
          </button>
        </div>

        {/* Provider Settings Form */}
        <div className="space-y-4">
          {/* Cloudflare R2 Form */}
          {selectedProvider === "R2" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <CloudSetupGuide
                title="Setup Guide (Cloudflare R2):"
                isDark={isDark}
                steps={[
                  {
                    step: 1,
                    text: (
                      <span>
                        Create a bucket in Cloudflare Dashboard &gt; <strong className={isDark ? "text-white" : "text-slate-900"}>R2 Object Storage</strong>.
                      </span>
                    ),
                  },
                  {
                    step: 2,
                    text: (
                      <span>
                        Create an API Token via <strong className={isDark ? "text-white" : "text-slate-900"}>Manage R2 API Tokens</strong> with Object Read &amp; Write permissions.
                      </span>
                    ),
                  },
                  {
                    step: 3,
                    text: (
                      <span>
                        Copy your <strong className={isDark ? "text-white" : "text-slate-900"}>Account ID, Access Key</strong>, &amp; Secret Key into the form below.
                      </span>
                    ),
                  },
                ]}
                notice={
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-xs flex items-start gap-2.5 mt-3",
                      isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-300" : "bg-cyan-50 border-cyan-300 text-cyan-950"
                    )}
                  >
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-cyan-950 dark:text-cyan-300">Advantages of Cloudflare R2:</div>
                      <p className="leading-relaxed text-[11px] text-cyan-900/90 dark:text-cyan-200">
                        Cloudflare R2 provides up to <strong>10 GB/month</strong> of free storage with <strong>zero egress bandwidth fees</strong> (no bandwidth charges for downloading backups).
                      </p>
                    </div>
                  </div>
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Cloudflare Account ID or Endpoint URL <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 78a1b2c3d4e5f6... or https://<account_id>.r2.cloudflarestorage.com"
                    value={config.endpoint || ""}
                    onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                    )}
                  />
                  <p className={cn("text-xs mt-1 font-medium", isDark ? "text-slate-400" : "text-slate-600")}>
                    Found in Cloudflare Dashboard &gt; R2 &gt; Overview &gt; Account ID.
                  </p>
                </div>

                <div>
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Bucket Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. my-vps-backups"
                    value={config.bucket || ""}
                    onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                    )}
                  />
                </div>

                <div>
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Subfolder / Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={`vps-${vmid || vpsId || "backup"}`}
                    value={config.pathPrefix || ""}
                    onChange={(e) => setConfig({ ...config, pathPrefix: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                    )}
                  />
                </div>

                <div>
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Access Key ID <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="R2 API Token Access Key ID"
                    value={config.accessKeyId || ""}
                    onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                    )}
                  />
                </div>

                <div>
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Secret Access Key <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretKey ? "text" : "password"}
                      placeholder={config.hasSecretKey ? "•••••••••••••••• (Leave blank to keep saved key)" : "Enter Secret Access Key"}
                      value={config.secretAccessKey || ""}
                      onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                      className={cn(
                        "w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                        isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950")}
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AWS S3 Form */}
          {selectedProvider === "S3" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <CloudSetupGuide
                title="Setup Guide (Amazon AWS S3):"
                isDark={isDark}
                steps={[
                  {
                    step: 1,
                    text: (
                      <span>
                        Create an S3 Bucket in AWS Console in your desired <strong className={isDark ? "text-white" : "text-slate-950 font-bold"}>Region</strong>.
                      </span>
                    ),
                  },
                  {
                    step: 2,
                    text: (
                      <span>
                        Create an IAM User with <strong className={isDark ? "text-white" : "text-slate-950 font-bold"}>AmazonS3FullAccess</strong> or s3:PutObject permissions.
                      </span>
                    ),
                  },
                  {
                    step: 3,
                    text: (
                      <span>
                        Generate an <strong className={isDark ? "text-white" : "text-slate-950 font-bold"}>Access Key</strong> under the Security Credentials tab &amp; enter it into the form.
                      </span>
                    ),
                  },
                ]}
                notice={
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-xs flex items-start gap-2.5 mt-3",
                      isDark ? "bg-slate-900/60 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
                    )}
                  >
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                    <div className="space-y-0.5">
                      <div className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>AWS S3 Configuration Tips:</div>
                      <p className="leading-relaxed text-[11px] text-slate-700 dark:text-slate-300">
                        Ensure the selected <strong>AWS Region</strong> matches the region where your bucket was created (e.g., <code>ap-southeast-3</code> for Jakarta).
                      </p>
                    </div>
                  </div>
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    AWS Region <span className="text-red-500 font-bold">*</span>
                  </label>
                  <Select
                    value={config.region || "ap-southeast-3"}
                    onChange={(val) => setConfig({ ...config, region: val })}
                    options={AWS_REGIONS}
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-300 text-slate-950"
                    )}
                  />
                </div>

                <div>
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Bucket Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. my-vps-backups-bucket"
                    value={config.bucket || ""}
                    onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                    )}
                  />
                </div>

                <div>
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Access Key ID <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="AKIA..."
                    value={config.accessKeyId || ""}
                    onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                    )}
                  />
                </div>

                <div>
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Secret Access Key <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretKey ? "text" : "password"}
                      placeholder={config.hasSecretKey ? "•••••••••••••••• (Leave blank to keep saved key)" : "Enter Secret Access Key"}
                      value={config.secretAccessKey || ""}
                      onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                      className={cn(
                        "w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                        isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950")}
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={cn("block text-xs font-bold uppercase tracking-wider mb-1.5", isDark ? "text-slate-300" : "text-slate-900")}>
                    Subfolder / Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={`vps-${vmid || vpsId || "backup"}`}
                    value={config.pathPrefix || ""}
                    onChange={(e) => setConfig({ ...config, pathPrefix: e.target.value })}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-950 placeholder-slate-400"
                    )}
                  />
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
                    : "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold"
                  : isDark
                  ? "bg-red-500/10 border-red-500/20 text-red-300"
                  : "bg-red-50 border-red-300 text-red-950 font-semibold"
              )}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-red-700 dark:text-red-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className={cn(
                "h-10 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto",
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-800 text-white border-slate-700/80 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 shadow-xs"
              )}
            >
              <RefreshCw className={cn("w-4 h-4 shrink-0", isTesting && "animate-spin")} />
              <span>{isTesting ? "Testing Connection..." : "Test Connection"}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving || isTesting}
              className="h-10 px-5 rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{isSaving ? "Saving Settings..." : "Save Settings"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Backups Table */}
      <div
        className={cn(
          "border rounded-2xl p-4 sm:p-6 shadow-lg transition-all",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-950")}>
              Your Cloud Backups ({records.length})
            </h3>
            <p className={cn("text-xs sm:text-sm mt-0.5 font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
              Archives stored directly on your personal cloud storage.
            </p>
          </div>
        </div>

        {isLoading && records.length === 0 ? (
          <div className="text-center py-12 px-4">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-cyan-600 dark:text-cyan-400" />
            <p className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600")}>
              Loading cloud backups...
            </p>
          </div>
        ) : records.length === 0 ? (
          <div className={cn("text-center py-12 px-4 rounded-xl border border-dashed", isDark ? "border-slate-800/80" : "border-slate-300 bg-slate-50/50")}>
            <Cloud className={cn("w-10 h-10 mx-auto mb-3", isDark ? "text-slate-600" : "text-slate-400")} />
            <h5 className={cn("font-bold text-sm mb-1", isDark ? "text-white" : "text-slate-900")}>
              No Cloud Backups Yet
            </h5>
            <p className={cn("text-xs max-w-sm mx-auto mb-4 font-medium", isDark ? "text-slate-400" : "text-slate-700")}>
              Configure your cloud credentials above and click &quot;Backup Now to Cloud&quot; to create your first free offsite backup.
            </p>
          </div>
        ) : (
          <>
            <div className={cn("overflow-x-auto rounded-xl border", isDark ? "border-slate-800/80 bg-[#060b14]/50" : "border-slate-300 bg-white")}>
            <table className="w-full text-left text-sm">
              <thead className={cn("text-xs font-bold uppercase tracking-wider border-b", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-100 text-slate-900 border-slate-300")}>
                <tr>
                  <th className="px-4 py-3.5">Backup Archive</th>
                  <th className="px-4 py-3.5">Storage</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5">Date Created</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-slate-800/60" : "divide-slate-200")}>
                {paginatedRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className={cn(
                      "transition-colors",
                      isDark ? "hover:bg-[#0b1322]/80" : "hover:bg-slate-50"
                    )}
                  >
                    <td className="px-4 py-3.5 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <HardDrive className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                        <span className={cn("font-semibold truncate max-w-[240px]", isDark ? "text-slate-200" : "text-slate-950")} title={rec.filename}>
                          {rec.filename}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                          rec.provider === "R2"
                            ? isDark ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-800 border-orange-300"
                            : isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-800 border-amber-300"
                        )}
                      >
                        {rec.provider === "R2" ? <CloudflareLogo className="w-3.5 h-3.5 shrink-0" /> : <AwsS3Logo className="w-3.5 h-3.5 shrink-0" />}
                        <span>{rec.provider === "R2" ? "Cloudflare R2" : "AWS S3"}</span>
                      </span>
                    </td>

                    <td className={cn("px-4 py-3.5 text-xs font-mono font-semibold", isDark ? "text-slate-400" : "text-slate-800")}>
                      {formatFileSize(rec.fileSize)}
                    </td>

                    <td className={cn("px-4 py-3.5 text-xs font-medium", isDark ? "text-slate-400" : "text-slate-700")}>
                      {new Date(rec.createdAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5">
                      {rec.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : rec.status === "FAILED" ? (
                        <button
                          type="button"
                          onClick={() => setErrorModal({
                            title: "Cloud Backup Error Details",
                            provider: rec.provider,
                            error: rec.error || "Cloud backup process failed to complete."
                          })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/20 transition-all cursor-pointer shadow-2xs"
                          title="Click to view error details"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Failed</span>
                          <Info className="w-3 h-3 shrink-0 ml-0.5 opacity-80" />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-400">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rec.status === "COMPLETED" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setRecordToRestore(rec);
                                setIsRestoreModalOpen(true);
                              }}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer",
                                isDark
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                                  : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                              )}
                              title="Restore VPS from this cloud backup archive"
                            >
                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              <span>Restore</span>
                            </button>

                            <a
                              href={`/api/user/vps/${vpsId}/cloud-backups/${rec.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs",
                                isDark
                                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
                                  : "bg-cyan-100 border-cyan-300 text-cyan-950 hover:bg-cyan-200"
                              )}
                            >
                              <Download className="w-3.5 h-3.5 shrink-0" />
                              <span>Download</span>
                            </a>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setRecordToDelete(rec);
                            setDeleteModalOpen(true);
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isDark ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-600 hover:text-red-600 hover:bg-red-50"
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

          {/* Pagination Controls */}
          {records.length > backupPageSize && (
            <div className={cn(
              "flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 border-t mt-3 text-xs font-medium",
              isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-600"
            )}>
              <div className="flex items-center gap-1 text-xs">
                <span>Showing</span>
                <span className={cn("font-bold font-mono", isDark ? "text-white" : "text-slate-900")}>
                  {(backupPage - 1) * backupPageSize + 1}-{Math.min(backupPage * backupPageSize, records.length)}
                </span>
                <span>of</span>
                <span className={cn("font-bold font-mono", isDark ? "text-white" : "text-slate-900")}>
                  {records.length}
                </span>
                <span>backups</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBackupPage((p) => Math.max(1, p - 1))}
                  disabled={backupPage === 1}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",
                    isDark
                      ? "border-slate-800 bg-[#060b14] hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
                  )}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalBackupPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setBackupPage(pg)}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer",
                        backupPage === pg
                          ? "bg-cyan-500 text-slate-950 font-extrabold shadow-sm"
                          : isDark
                          ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                          : "hover:bg-slate-100 text-slate-600 hover:text-slate-950"
                      )}
                    >
                      {pg}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setBackupPage((p) => Math.min(totalBackupPages, p + 1))}
                  disabled={backupPage === totalBackupPages}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",
                    isDark
                      ? "border-slate-800 bg-[#060b14] hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
                  )}
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
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

      {/* Cloud Backup Diagnostic Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto",
              isDark ? "bg-[#0b1322] border-slate-800 text-white shadow-2xl" : "bg-white border-slate-200 text-slate-900 shadow-xl"
            )}
          >
            {/* Close button */}
            <button
              onClick={() => setErrorModal(null)}
              className={cn(
                "absolute right-4 top-4 p-1.5 rounded-lg transition-colors cursor-pointer",
                isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5 mb-4 pr-6">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border",
                  "bg-red-500/10 border-red-500/30 text-red-500"
                )}
              >
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className={cn("text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {errorModal.title}
                </h3>
                <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-700 font-medium")}>
                  Provider: <span className="font-bold text-slate-950 dark:text-white">{errorModal.provider === "R2" ? "Cloudflare R2" : errorModal.provider === "S3" ? "AWS S3" : errorModal.provider}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <p className={cn("text-xs leading-relaxed font-medium", isDark ? "text-slate-300" : "text-slate-800")}>
                An error occurred while processing the cloud backup. System error details:
              </p>
              <div className={cn("p-3 rounded-xl border font-mono text-[11px] font-semibold leading-relaxed break-all max-h-48 overflow-y-auto", isDark ? "bg-black/50 border-slate-800 text-red-300" : "bg-red-50 border-red-300 text-red-950")}>
                {errorModal.error}
              </div>
            </div>

            {/* Actions */}
            <div className={cn("flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t", isDark ? "border-slate-800/40" : "border-slate-200")}>
              <button
                type="button"
                onClick={() => setErrorModal(null)}
                className={cn(
                  "w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                  isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 shadow-2xs"
                )}
              >
                Close
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Confirm Backup Modal */}
      {isConfirmBackupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200",
              isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"
            )}
          >
            <button
              onClick={() => setIsConfirmBackupOpen(false)}
              className={cn(
                "absolute right-4 top-4 p-1.5 rounded-lg transition-colors cursor-pointer",
                isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3.5 mb-4 pr-6">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <CloudUpload className="w-6 h-6" />
              </div>
              <div>
                <h3 className={cn("text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  Confirm Cloud Backup
                </h3>
                <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-600 font-medium")}>
                  Full snapshot backup of VPS #{vps?.id} ({vps?.name || `VM ${vmid}`})
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <p className={cn("text-xs leading-relaxed font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
                A complete live snapshot of this virtual machine will be generated using Proxmox vzdump (Zstandard compressed format) and streamed directly to your configured cloud storage.
              </p>

              <div className={cn("p-3.5 rounded-xl border text-xs space-y-2", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-300")}>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Destination Provider:</span>
                  <span className="font-bold inline-flex items-center gap-1.5">
                    {selectedProvider === "R2" ? <CloudflareLogo className="w-3.5 h-3.5" /> : <AwsS3Logo className="w-3.5 h-3.5" />}
                    <span>{selectedProvider === "R2" ? "Cloudflare R2" : "AWS S3"}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Target Location:</span>
                  <span className={cn("font-mono font-bold truncate max-w-[240px]", isDark ? "text-cyan-300" : "text-cyan-900")}>
                    {`${config.bucket || "bucket"}/${config.pathPrefix || `vps-${vmid}`}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Archive Type:</span>
                  <span className="font-mono font-bold text-emerald-400">.vma.zst (QEMU vzdump)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>VM Downtime:</span>
                  <span className="font-bold text-emerald-400">Zero (Live Snapshot)</span>
                </div>
              </div>
            </div>

            <div className={cn("flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t", isDark ? "border-slate-800/60" : "border-slate-200")}>
              <button
                type="button"
                onClick={() => setIsConfirmBackupOpen(false)}
                className={cn(
                  "w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                  isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunBackup}
                disabled={isBackingUp}
                className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                <span>Confirm &amp; Backup Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup Modal */}
      {successModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200",
              isDark ? "bg-[#0b1322] border-slate-800 text-white shadow-2xl" : "bg-white border-slate-200 text-slate-900 shadow-xl"
            )}
          >
            <button
              onClick={() => setSuccessModalRecord(null)}
              className={cn(
                "absolute right-4 top-4 p-1.5 rounded-lg transition-colors cursor-pointer",
                isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3.5 mb-4 pr-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className={cn("text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Cloud Backup Completed!
                  </h3>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-600 font-medium")}>
                  Your VPS archive is safely saved and ready for download or restore.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div className={cn("p-4 rounded-xl border text-xs space-y-2.5", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-300")}>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Archive Filename:</span>
                  <span className="font-mono font-bold text-xs truncate max-w-[240px]" title={successModalRecord.filename}>
                    {successModalRecord.filename}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Archive Size:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatFileSize(successModalRecord.fileSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Cloud Storage:</span>
                  <span className="font-bold inline-flex items-center gap-1.5">
                    {successModalRecord.provider === "R2" ? <CloudflareLogo className="w-3.5 h-3.5" /> : <AwsS3Logo className="w-3.5 h-3.5" />}
                    <span>{successModalRecord.provider === "R2" ? "Cloudflare R2" : "AWS S3"}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Date Created:</span>
                  <span className="font-medium">
                    {new Date(successModalRecord.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className={cn("flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t", isDark ? "border-slate-800/60" : "border-slate-200")}>
              <button
                type="button"
                onClick={() => setSuccessModalRecord(null)}
                className={cn(
                  "w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                  isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300"
                )}
              >
                Close
              </button>
              {successModalRecord.downloadUrl && (
                <a
                  href={`/api/user/vps/${vpsId}/cloud-backups/${successModalRecord.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Archive</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {isRestoreModalOpen && recordToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200",
              isDark ? "bg-[#0b1322] border-slate-800 text-white shadow-2xl" : "bg-white border-slate-200 text-slate-900 shadow-xl"
            )}
          >
            <button
              onClick={() => {
                setIsRestoreModalOpen(false);
                setRecordToRestore(null);
              }}
              disabled={isRestoring}
              className={cn(
                "absolute right-4 top-4 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50",
                isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3.5 mb-4 pr-6">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className={cn("text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  Restore VPS from Cloud Backup
                </h3>
                <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-600 font-medium")}>
                  Rollback VM #{vps?.id} to snapshot state
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div className={cn("p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5", isDark ? "bg-amber-500/10 border-amber-500/25 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-950 font-medium")}>
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Warning: VM Overwrite &amp; Temporary Shutdown</span>
                </div>
                <p className="text-[11px]">
                  Restoring this backup will temporarily power off the VPS and overwrite all current disk data and configuration with the snapshot state. Any uncommitted data created after this backup date will be replaced.
                </p>
              </div>

              <div className={cn("p-3.5 rounded-xl border text-xs space-y-2", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-300")}>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Archive:</span>
                  <span className="font-mono font-bold text-xs truncate max-w-[240px]" title={recordToRestore.filename}>
                    {recordToRestore.filename}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Archive Size:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {formatFileSize(recordToRestore.fileSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Backup Provider:</span>
                  <span className="font-bold">
                    {recordToRestore.provider === "R2" ? "Cloudflare R2" : "AWS S3"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-600"}>Created At:</span>
                  <span className="font-medium">
                    {new Date(recordToRestore.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className={cn("flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t", isDark ? "border-slate-800/60" : "border-slate-200")}>
              <button
                type="button"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setRecordToRestore(null);
                }}
                disabled={isRestoring}
                className={cn(
                  "w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50",
                  isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={isRestoring}
                className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Initiating Restore...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm &amp; Restore VPS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
