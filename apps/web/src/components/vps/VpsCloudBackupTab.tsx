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
  X
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

function GoogleDriveLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574z" fill="#FFBA00" />
      <path d="M7.25 3.215a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214z" fill="#00AC47" />
      <path d="M9.509 15.867l-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" fill="#2684FC" />
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
        isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-slate-50 border-slate-200"
      )}
    >
      <div className={cn("flex items-center gap-2 font-semibold mb-3", isDark ? "text-cyan-400" : "text-cyan-700")}>
        <Info className="w-4 h-4 shrink-0" />
        <span>{title}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
        {steps.map((s) => (
          <div
            key={s.step}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all h-full min-h-[64px]",
              isDark ? "bg-black/25 border-white/5" : "bg-white border-slate-200 shadow-2xs"
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs",
                isDark
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-cyan-100 text-cyan-800 border border-cyan-300"
              )}
            >
              <span className="inline-flex items-center justify-center leading-none text-center">{s.step}</span>
            </div>
            <div className={cn("text-xs leading-snug flex-1", isDark ? "text-slate-300" : "text-slate-700")}>
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
  const [errorModal, setErrorModal] = useState<{ title: string; provider: string; error: string } | null>(null);
  const prevActiveIdRef = useRef<number | null>(null);

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
        const newRecords: BackupRecord[] = data.records || [];
        setRecords(newRecords);

        // Auto-detect if a previously active backup failed
        const currentActive = newRecords.find(
          (r) => r.status === "CREATING_BACKUP" || r.status === "UPLOADING_TO_CLOUD" || r.status === "PREPARING"
        );

        if (prevActiveIdRef.current) {
          const finishedRec = newRecords.find((r) => r.id === prevActiveIdRef.current);
          if (finishedRec && finishedRec.status === "FAILED") {
            setErrorModal({
              title: "Cloud Backup Gagal",
              provider: finishedRec.provider,
              error: finishedRec.error || "Proses backup terhenti sebelum selesai."
            });
          }
        }

        prevActiveIdRef.current = currentActive ? currentActive.id : null;
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

  // Handle drag-and-drop or file selection of Google Cloud Service Account JSON
  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.client_email && parsed.private_key) {
          setConfig((prev) => ({
            ...prev,
            gdriveClientEmail: parsed.client_email,
            gdrivePrivateKey: parsed.private_key
          }));
          setShowPrivateKey(false);
          toast.success(`Loaded credentials for ${parsed.client_email}!`);
        } else {
          toast.error("Invalid Service Account JSON: client_email or private_key missing");
        }
      } catch {
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
            gdrivePrivateKey: ""
          }));
          setShowPrivateKey(false);
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
        const errorMsg = data.error || "Failed to start cloud backup";
        toast.error(errorMsg);
        setErrorModal({
          title: "Gagal Memulai Cloud Backup",
          provider: selectedProvider,
          error: errorMsg
        });
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Network error";
      toast.error(errorMsg);
      setErrorModal({
        title: "Gagal Memulai Cloud Backup",
        provider: selectedProvider,
        error: errorMsg
      });
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
              <h3 className={cn("text-base sm:text-lg font-semibold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Cloud Storage Backup (Bring Your Own Storage)
              </h3>
              <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                Free Feature
              </span>
            </div>
            <p className={cn("text-xs sm:text-sm max-w-2xl leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              Backup this entire virtual machine directly to your personal cloud storage without consuming local Proxmox storage quota. Supported providers: Cloudflare R2, AWS S3, and Google Drive.
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
                  ? "bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline-block ml-2 text-xs">Refresh</span>
            </button>

            <button
              onClick={handleRunBackup}
              disabled={isBackingUp || Boolean(activeBackup) || vpsStatus === "SUSPENDED"}
              className="flex-1 sm:flex-initial h-10 flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl transition-all disabled:opacity-50 font-semibold text-xs sm:text-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm whitespace-nowrap"
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
                  ? "bg-slate-900/90 border-cyan-500/40 shadow-[0_4px_28px_rgba(34,211,238,0.14)]"
                  : "bg-cyan-50/80 border-cyan-300 shadow-sm"
              )}
            >
              {/* Header: Stage info + Live Percentage Counter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    isDark ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-cyan-100/80 border-cyan-300 text-cyan-700"
                  )}>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                        isDark ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "bg-cyan-100 text-cyan-800 border-cyan-300"
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
                    isDark ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "text-cyan-700"
                  )}>
                    {progressPct}%
                  </span>
                  <span className={cn("text-[11px] font-bold uppercase", isDark ? "text-slate-400" : "text-slate-600")}>Done</span>
                </div>
              </div>

              {/* Glowing Progress Bar Track */}
              <div className={cn(
                "w-full h-3 sm:h-3.5 rounded-full overflow-hidden relative p-0.5 border",
                isDark ? "bg-black/40 border-white/10" : "bg-slate-200 border-slate-300"
              )}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_14px_rgba(34,211,238,0.6)] relative overflow-hidden"
                  style={{ width: `${progressPct}%` }}
                >
                  {/* Subtle animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[pulse_2s_infinite]" />
                </div>
              </div>

              {/* Sub-details telemetries */}
              <div className={cn(
                "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 mt-3 text-xs",
                isDark ? "text-slate-400" : "text-slate-600"
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
          <h4 className={cn("text-base font-semibold mb-1", isDark ? "text-white" : "text-slate-900")}>
            Storage Provider Configuration
          </h4>
          <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
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
              "p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 relative group",
              selectedProvider === "R2"
                ? isDark
                  ? "bg-cyan-500/10 border-cyan-500/60 text-white shadow-[0_0_20px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/40"
                  : "bg-cyan-50/80 border-cyan-500 text-slate-900 ring-1 ring-cyan-500/40 shadow-sm"
                : isDark
                ? "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700/80 hover:bg-slate-800/30"
                : "bg-slate-50/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                  isDark
                    ? selectedProvider === "R2"
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-slate-800/60 border-slate-700/60 group-hover:border-slate-600"
                    : selectedProvider === "R2"
                    ? "bg-cyan-100/50 border-cyan-300"
                    : "bg-white border-slate-200"
                )}
              >
                <CloudflareLogo className="w-6 h-6 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                  <span>Cloudflare R2</span>
                  {config.provider === "R2" && config.hasSecretKey && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Configured" />
                  )}
                </div>
                <p className={cn("text-xs mt-0.5 truncate", isDark ? "text-slate-400" : "text-slate-500")}>Zero egress fees, S3 API</p>
              </div>
            </div>

            {/* Selection indicator radio dot */}
            <div
              className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                selectedProvider === "R2"
                  ? "border-cyan-400 bg-cyan-400"
                  : isDark
                  ? "border-slate-700 bg-transparent"
                  : "border-slate-300 bg-transparent"
              )}
            >
              {selectedProvider === "R2" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
            </div>
          </button>

          {/* AWS S3 */}
          <button
            type="button"
            onClick={() => handleSelectProvider("S3")}
            className={cn(
              "p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 relative group",
              selectedProvider === "S3"
                ? isDark
                  ? "bg-cyan-500/10 border-cyan-500/60 text-white shadow-[0_0_20px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/40"
                  : "bg-cyan-50/80 border-cyan-500 text-slate-900 ring-1 ring-cyan-500/40 shadow-sm"
                : isDark
                ? "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700/80 hover:bg-slate-800/30"
                : "bg-slate-50/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                  isDark
                    ? selectedProvider === "S3"
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-slate-800/60 border-slate-700/60 group-hover:border-slate-600"
                    : selectedProvider === "S3"
                    ? "bg-cyan-100/50 border-cyan-300"
                    : "bg-white border-slate-200"
                )}
              >
                <AwsS3Logo className="w-6 h-6 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                  <span>Amazon AWS S3</span>
                  {config.provider === "S3" && config.hasSecretKey && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Configured" />
                  )}
                </div>
                <p className={cn("text-xs mt-0.5 truncate", isDark ? "text-slate-400" : "text-slate-500")}>Industry standard storage</p>
              </div>
            </div>

            {/* Selection indicator radio dot */}
            <div
              className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                selectedProvider === "S3"
                  ? "border-cyan-400 bg-cyan-400"
                  : isDark
                  ? "border-slate-700 bg-transparent"
                  : "border-slate-300 bg-transparent"
              )}
            >
              {selectedProvider === "S3" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
            </div>
          </button>

          {/* Google Drive */}
          <button
            type="button"
            onClick={() => handleSelectProvider("GDRIVE")}
            className={cn(
              "p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 relative group",
              selectedProvider === "GDRIVE"
                ? isDark
                  ? "bg-cyan-500/10 border-cyan-500/60 text-white shadow-[0_0_20px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/40"
                  : "bg-cyan-50/80 border-cyan-500 text-slate-900 ring-1 ring-cyan-500/40 shadow-sm"
                : isDark
                ? "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700/80 hover:bg-slate-800/30"
                : "bg-slate-50/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                  isDark
                    ? selectedProvider === "GDRIVE"
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-slate-800/60 border-slate-700/60 group-hover:border-slate-600"
                    : selectedProvider === "GDRIVE"
                    ? "bg-cyan-100/50 border-cyan-300"
                    : "bg-white border-slate-200"
                )}
              >
                <GoogleDriveLogo className="w-6 h-6 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                  <span>Google Drive</span>
                  {config.provider === "GDRIVE" && config.hasPrivateKey && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Configured" />
                  )}
                </div>
                <p className={cn("text-xs mt-0.5 truncate", isDark ? "text-slate-400" : "text-slate-500")}>Workspace Shared Drive</p>
              </div>
            </div>

            {/* Selection indicator radio dot */}
            <div
              className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                selectedProvider === "GDRIVE"
                  ? "border-cyan-400 bg-cyan-400"
                  : isDark
                  ? "border-slate-700 bg-transparent"
                  : "border-slate-300 bg-transparent"
              )}
            >
              {selectedProvider === "GDRIVE" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
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
                        Buat bucket di Cloudflare Dashboard &gt; <strong className={isDark ? "text-white" : "text-slate-900"}>R2 Object Storage</strong>.
                      </span>
                    ),
                  },
                  {
                    step: 2,
                    text: (
                      <span>
                        Buat API Token via <strong className={isDark ? "text-white" : "text-slate-900"}>Manage R2 API Tokens</strong> dengan izin Object Read &amp; Write.
                      </span>
                    ),
                  },
                  {
                    step: 3,
                    text: (
                      <span>
                        Salin <strong className={isDark ? "text-white" : "text-slate-900"}>Account ID, Access Key</strong>, &amp; Secret Key ke form di bawah.
                      </span>
                    ),
                  },
                ]}
                notice={
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-xs flex items-start gap-2.5 mt-3",
                      isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-900"
                    )}
                  >
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-cyan-900 dark:text-cyan-300">Keunggulan Cloudflare R2:</div>
                      <p className="leading-relaxed text-[11px]">
                        Cloudflare R2 menyediakan kuota penyimpanan gratis hingga <strong>10 GB/bulan</strong> dengan <strong>zero egress bandwidth fees</strong> (bebas biaya transfer download backup).
                      </p>
                    </div>
                  </div>
                }
              />

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
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
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
                        Buat S3 Bucket di AWS Console pada <strong className={isDark ? "text-white" : "text-slate-900"}>Region</strong> yang diinginkan.
                      </span>
                    ),
                  },
                  {
                    step: 2,
                    text: (
                      <span>
                        Buat IAM User dengan permission <strong className={isDark ? "text-white" : "text-slate-900"}>AmazonS3FullAccess</strong> atau s3:PutObject.
                      </span>
                    ),
                  },
                  {
                    step: 3,
                    text: (
                      <span>
                        Generate <strong className={isDark ? "text-white" : "text-slate-900"}>Access Key</strong> di tab Security Credentials &amp; masukkan ke form.
                      </span>
                    ),
                  },
                ]}
                notice={
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-xs flex items-start gap-2.5 mt-3",
                      isDark ? "bg-slate-900/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                    )}
                  >
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                    <div className="space-y-0.5">
                      <div className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>Tips Konfigurasi AWS S3:</div>
                      <p className="leading-relaxed text-[11px]">
                        Pastikan pilihan <strong>AWS Region</strong> di form sesuai dengan lokasi Region bucket dibuat (misal: <code>ap-southeast-3</code> untuk Jakarta).
                      </p>
                    </div>
                  </div>
                }
              />

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
                      className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
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
            </div>
          )}

          {/* Google Drive Form */}
          {selectedProvider === "GDRIVE" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Quick Auto-Fill via JSON Key File */}
              <div className={cn(
                "relative border border-dashed rounded-2xl p-4 transition-all group cursor-pointer text-center",
                isDark
                  ? "border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-500/[0.03] hover:bg-cyan-500/[0.06]"
                  : "border-cyan-300 hover:border-cyan-400 bg-cyan-50/60 hover:bg-cyan-50"
              )}>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  title="Upload Google Cloud Service Account JSON Key"
                />
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pointer-events-none">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                    isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-100 border-cyan-300 text-cyan-700"
                  )}>
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className={cn("text-xs sm:text-sm font-semibold flex items-center justify-center sm:justify-start gap-2", isDark ? "text-white" : "text-slate-900")}>
                      <span>Auto-Fill from Service Account JSON</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border flex items-center gap-1",
                        isDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-cyan-100 text-cyan-800 border-cyan-300"
                      )}>
                        <Zap className="w-2.5 h-2.5" />
                        <span>Instant</span>
                      </span>
                    </div>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-600")}>
                      Drop your downloaded <code className={cn("px-1.5 py-0.5 rounded font-mono text-[11px]", isDark ? "bg-cyan-500/10 text-cyan-300" : "bg-slate-200 text-slate-800")}>.json</code> key file here to auto-fill Email &amp; RSA Key.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3-Step Setup Guide */}
              <CloudSetupGuide
                title="Setup Guide (Google Drive / Shared Drive):"
                isDark={isDark}
                steps={[
                  {
                    step: 1,
                    text: (
                      <span>
                        Enable <strong className={isDark ? "text-white" : "text-slate-900"}>Google Drive API</strong> di Google Cloud Console.
                      </span>
                    ),
                  },
                  {
                    step: 2,
                    text: (
                      <span>
                        Buat Service Account &amp; unduh file <strong className={isDark ? "text-white" : "text-slate-900"}>JSON Key</strong> (bisa auto-fill di atas).
                      </span>
                    ),
                  },
                  {
                    step: 3,
                    text: (
                      <span>
                        Share folder di <strong className="text-emerald-600 dark:text-emerald-400">Shared Drive (Drive Bersama)</strong> ke email Service Account sebagai Content Manager.
                      </span>
                    ),
                  },
                ]}
                notice={
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-xs flex items-start gap-2.5 mt-3",
                      isDark ? "bg-amber-500/10 border-amber-500/25 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900"
                    )}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-900 dark:text-amber-300">Penting Mengenai Kuota Google Drive:</div>
                      <p className="leading-relaxed text-[11px]">
                        Akun Service Account memiliki kuota <strong>0 MB</strong> di Google Drive pribadi (Personal My Drive). Google mewajibkan penggunaan <strong>Google Workspace Shared Drive (Drive Bersama / Team Drive)</strong> agar file backup dapat disimpan, atau gunakan <strong>Cloudflare R2</strong> / <strong>AWS S3</strong>.
                      </p>
                    </div>
                  </div>
                }
              />

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Folder ID */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={cn("block text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-300" : "text-slate-700")}>
                      Google Drive Folder ID <span className="text-red-400">*</span>
                    </label>
                    <a
                      href="https://drive.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <span>Open Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs pointer-events-none hidden sm:block">
                      folders/
                    </div>
                    <input
                      type="text"
                      placeholder="1A2b3C4d5E6f7G8h9I..."
                      value={config.gdriveFolderId || ""}
                      onChange={(e) => {
                        let val = e.target.value.trim();
                        // Auto-extract ID if full browser URL is pasted
                        const match = val.match(/folders\/([a-zA-Z0-9_-]+)/);
                        if (match && match[1]) {
                          val = match[1];
                          toast.success("Folder ID extracted from URL!");
                        }
                        setConfig({ ...config, gdriveFolderId: val });
                      }}
                      className={cn(
                        "w-full px-3.5 sm:pl-20 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                        isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Paste the Folder ID or full URL from your browser address bar.
                  </p>
                </div>

                {/* Client Email */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={cn("block text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-300" : "text-slate-700")}>
                      Service Account Client Email <span className="text-red-400">*</span>
                    </label>
                    {config.gdriveClientEmail && (
                      <span className="text-[10px] text-emerald-400 font-medium">Ready to share</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="my-backup-bot@project-id.iam.gserviceaccount.com"
                      value={config.gdriveClientEmail || ""}
                      onChange={(e) => setConfig({ ...config, gdriveClientEmail: e.target.value.trim() })}
                      className={cn(
                        "w-full pl-3.5 pr-20 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500",
                        isDark ? "bg-slate-900/60 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                      )}
                    />
                    {config.gdriveClientEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(config.gdriveClientEmail || "");
                          toast.success("Email copied! Share your Google Drive folder with this email as Editor.");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all flex items-center gap-1 shadow-xs"
                        title="Copy email to share in Google Drive"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Share your Google Drive folder with this email and give it <strong>Editor</strong> permission.
                  </p>
                </div>

                {/* Private Key - Cyber Vault vs Code Editor */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", isDark ? "text-slate-300" : "text-slate-700")}>
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Service Account Private Key (RSA PKCS#8)</span>
                      <span className="text-red-400">*</span>
                    </label>

                    {/* Security Badge */}
                    {config.hasPrivateKey && !showPrivateKey && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" /> 2048-bit Key Saved
                      </span>
                    )}
                  </div>

                  {/* Case 1: Key is already configured and user is not editing */}
                  {config.hasPrivateKey && !showPrivateKey ? (
                    <div
                      className={cn(
                        "rounded-xl border p-4 transition-all relative overflow-hidden group",
                        isDark ? "bg-[#080d1a] border-slate-800 shadow-sm" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold tracking-widest text-slate-300">
                                ••••••••••••••••••••••••••••••••
                              </span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                RSA-KEY
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Encrypted RSA private key is securely stored. Click below if you want to replace it.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPrivateKey(true);
                            setConfig((prev) => ({ ...prev, gdrivePrivateKey: "" }));
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Replace / Enter New Key</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Case 2: Terminal / PEM Code Editor for entering Key */
                    <div className={cn(
                      "rounded-xl border overflow-hidden shadow-sm transition-all focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500",
                      isDark ? "border-slate-800 bg-[#080d1a]" : "border-slate-300 bg-white"
                    )}>
                      {/* Terminal Window Header Bar */}
                      <div className={cn(
                        "px-3.5 py-2 border-b flex items-center justify-between",
                        isDark ? "border-slate-800/80 bg-slate-900/80 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-600"
                      )}>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                          </div>
                          <span className="text-[11px] font-mono ml-2">service_account_private_key.pem</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {config.hasPrivateKey && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowPrivateKey(false);
                                setConfig((prev) => ({ ...prev, gdrivePrivateKey: "" }));
                              }}
                              className={cn(
                                "text-[11px] px-2 py-0.5 rounded transition-colors",
                                isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                              )}
                            >
                              Cancel &amp; Keep Saved Key
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Textarea Code Editor */}
                      <div className="relative p-2">
                        <textarea
                          rows={6}
                          placeholder={`-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----`}
                          value={config.gdrivePrivateKey || ""}
                          onChange={(e) => {
                            let val = e.target.value;
                            // Smart auto-detect: Did the user accidentally paste the entire JSON?
                            if (val.trim().startsWith("{") && val.includes("private_key")) {
                              try {
                                const parsed = JSON.parse(val);
                                if (parsed.private_key) {
                                  setConfig((prev) => ({
                                    ...prev,
                                    gdrivePrivateKey: parsed.private_key,
                                    gdriveClientEmail: parsed.client_email || prev.gdriveClientEmail
                                  }));
                                  toast.success("Auto-extracted RSA Key and Client Email from JSON!");
                                  return;
                                }
                              } catch {
                                // Not valid JSON yet, continue normal flow
                              }
                            }
                            setConfig({ ...config, gdrivePrivateKey: val });
                          }}
                          className={cn(
                            "w-full p-2.5 bg-transparent border-0 text-xs font-mono focus:outline-none resize-y leading-relaxed",
                            isDark ? "text-cyan-200/90 placeholder-slate-600" : "text-slate-900 placeholder-slate-400"
                          )}
                          spellCheck={false}
                        />
                      </div>

                      {/* Textarea Footer Help */}
                      <div className={cn(
                        "px-3 py-1.5 border-t flex items-center justify-between text-[11px]",
                        isDark ? "border-slate-800/60 bg-black/40 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-600"
                      )}>
                        <span>Format: Standard PKCS#8 RSA PEM (Starts with BEGIN PRIVATE KEY)</span>
                        {config.gdrivePrivateKey && (
                          <span className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                            {config.gdrivePrivateKey.length} characters
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
          <div className="pt-4 border-t border-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className={cn(
                "h-10 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto",
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-800 text-white border-slate-700/80 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-xs"
              )}
            >
              <RefreshCw className={cn("w-4 h-4 shrink-0", isTesting && "animate-spin")} />
              <span>{isTesting ? "Testing Connection..." : "Test Connection"}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving || isTesting}
              className="h-10 px-5 rounded-xl font-semibold text-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
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
            <h4 className={cn("text-base font-semibold", isDark ? "text-white" : "text-slate-900")}>
              Your Cloud Backups ({records.length})
            </h4>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
              Archives stored directly on your personal cloud storage.
            </p>
          </div>
        </div>

        {records.length === 0 ? (
          <div className={cn("text-center py-12 px-4 rounded-xl border border-dashed", isDark ? "border-slate-800/80" : "border-slate-200")}>
            <Cloud className="w-10 h-10 mx-auto text-slate-400 mb-3 opacity-60" />
            <h5 className={cn("font-medium text-sm mb-1", isDark ? "text-white" : "text-slate-800")}>
              No Cloud Backups Yet
            </h5>
            <p className={cn("text-xs max-w-sm mx-auto mb-4", isDark ? "text-slate-400" : "text-slate-500")}>
              Configure your cloud credentials above and click &quot;Backup Now to Cloud&quot; to create your first free offsite backup.
            </p>
          </div>
        ) : (
          <div className={cn("overflow-x-auto rounded-xl border", isDark ? "border-slate-800/60" : "border-slate-200")}>
            <table className="w-full text-left text-sm">
              <thead className={cn("text-xs font-semibold uppercase tracking-wider border-b", isDark ? "bg-slate-900/60 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200")}>
                <tr>
                  <th className="px-4 py-3.5">Backup Archive</th>
                  <th className="px-4 py-3.5">Storage</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5">Date Created</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-slate-800/40" : "divide-slate-200")}>
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
                        <HardDrive className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                        <span className={cn("font-medium truncate max-w-[240px]", isDark ? "text-slate-200" : "text-slate-800")} title={rec.filename}>
                          {rec.filename}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                          rec.provider === "R2"
                            ? isDark ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-700 border-orange-200"
                            : rec.provider === "S3"
                            ? isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"
                            : isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                      >
                        {rec.provider === "R2" && <CloudflareLogo className="w-3.5 h-3.5 shrink-0" />}
                        {rec.provider === "S3" && <AwsS3Logo className="w-3.5 h-3.5 shrink-0" />}
                        {rec.provider === "GDRIVE" && <GoogleDriveLogo className="w-3.5 h-3.5 shrink-0" />}
                        <span>{rec.provider === "R2" ? "Cloudflare R2" : rec.provider === "S3" ? "AWS S3" : "Google Drive"}</span>
                      </span>
                    </td>

                    <td className={cn("px-4 py-3.5 text-xs font-mono", isDark ? "text-slate-400" : "text-slate-600")}>
                      {formatFileSize(rec.fileSize)}
                    </td>

                    <td className={cn("px-4 py-3.5 text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
                      {new Date(rec.createdAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5">
                      {rec.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : rec.status === "FAILED" ? (
                        <button
                          type="button"
                          onClick={() => setErrorModal({
                            title: "Detail Error Cloud Backup",
                            provider: rec.provider,
                            error: rec.error || "Proses cloud backup gagal dilakukan."
                          })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                          title="Klik untuk melihat detail error"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Failed</span>
                          <Info className="w-3 h-3 shrink-0 ml-0.5 opacity-80" />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
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

      {/* Cloud Backup Diagnostic Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto",
              isDark ? "bg-[#0b1322] border-slate-800 text-white shadow-cyan-950/20" : "bg-white border-slate-200 text-slate-900 shadow-xl"
            )}
          >
            {/* Close button */}
            <button
              onClick={() => setErrorModal(null)}
              className={cn(
                "absolute right-4 top-4 p-1.5 rounded-lg transition-colors",
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
                  errorModal.error.includes("storageQuotaExceeded") || errorModal.error.includes("do not have storage quota") || errorModal.error.includes("Kuota Google Drive Tidak Cukup")
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    : "bg-red-500/10 border-red-500/30 text-red-500"
                )}
              >
                {errorModal.error.includes("storageQuotaExceeded") || errorModal.error.includes("do not have storage quota") || errorModal.error.includes("Kuota Google Drive Tidak Cukup") ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className={cn("text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {errorModal.error.includes("storageQuotaExceeded") || errorModal.error.includes("do not have storage quota") || errorModal.error.includes("Kuota Google Drive Tidak Cukup")
                    ? "Kapasitas Penyimpanan / Kuota Tidak Cukup"
                    : errorModal.title}
                </h3>
                <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-600")}>
                  Provider: <span className="font-semibold">{errorModal.provider}</span>
                </p>
              </div>
            </div>

            {/* Quota-specific explanation if applicable */}
            {(errorModal.error.includes("storageQuotaExceeded") || errorModal.error.includes("do not have storage quota") || errorModal.error.includes("Kuota Google Drive Tidak Cukup")) ? (
              <div className="space-y-3 mb-5">
                <div className={cn("p-3.5 rounded-xl border text-xs leading-relaxed space-y-2", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-200/90" : "bg-amber-50 border-amber-200 text-amber-900")}>
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Penyebab Masalah:</span>
                  </div>
                  <p>
                    Akun <strong>Google Cloud Service Account</strong> secara default memiliki kuota penyimpanan <strong>0 MB</strong> di Google Drive pribadi (Personal My Drive). Google melarang pengunggahan file dari Service Account ke akun Google Drive perorangan non-workspace.
                  </p>
                </div>

                <div className={cn("p-3.5 rounded-xl border text-xs space-y-2.5", isDark ? "bg-slate-900/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                  <div className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>Solusi yang Dapat Dilakukan:</div>
                  <ul className="space-y-2 pl-4 list-disc text-[11px] leading-relaxed">
                    <li>
                      <strong>Gunakan Google Workspace Shared Drive:</strong> Buat folder di Shared Drive (Drive Bersama / Team Drive), lalu invite email Service Account sebagai <em>Content Manager</em>. Di Shared Drive, kuota dihitung dari akun workspace, bukan Service Account.
                    </li>
                    <li>
                      <strong>Gunakan Cloudflare R2 (Rekomendasi Terbaik):</strong> Gratis 10 GB/bulan tanpa biaya download (egress), setup sangat mudah menggunakan Account ID dan S3 API Keys.
                    </li>
                    <li>
                      <strong>Gunakan AWS S3:</strong> Buat bucket S3 dan gunakan IAM user dengan hak akses write.
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-5">
                <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
                  Terjadi kesalahan saat memproses cloud backup. Detail pesan error sistem:
                </p>
                <div className={cn("p-3 rounded-xl border font-mono text-[11px] leading-relaxed break-all max-h-48 overflow-y-auto", isDark ? "bg-black/50 border-slate-800 text-red-300" : "bg-red-50/70 border-red-200 text-red-800")}>
                  {errorModal.error}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setErrorModal(null)}
                className={cn(
                  "w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                  isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                )}
              >
                Tutup
              </button>
              {(errorModal.error.includes("storageQuotaExceeded") || errorModal.error.includes("do not have storage quota") || errorModal.error.includes("Kuota Google Drive Tidak Cukup")) && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectProvider("R2");
                    setErrorModal(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 transition-all shadow-xs"
                >
                  Pindah ke Cloudflare R2
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
