"use client";
import { useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { User, Shield, Key, Save, Camera, CheckCircle2, XCircle, Trash2, X, Share2, Layout, Phone, FileText, Search, Check, CheckCircle, Settings, RefreshCw, Info, HardDrive, Eye, EyeOff, Server, AlertCircle, ArrowLeftRight, Rocket, Database, Boxes } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const inputClassDark = 'w-full bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all';
const inputClassLight = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-all';
const labelClassDark = 'block text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2';
const labelClassLight = 'block text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 sm:mb-2';

export default function SettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const inputClass = isDark ? inputClassDark : inputClassLight;
  const labelClass = isDark ? labelClassDark : labelClassLight;
  const [activeTab, setActiveTab] = useUrlTab<'profile' | 'contact' | 'website' | 'seo' | 'security' | 'services' | 'storage' | 'database' | 'apps'>('profile', { allowed: ['profile', 'contact', 'website', 'seo', 'security', 'services', 'storage', 'database', 'apps'] as const });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, desc: 'Manage personal info' },
    { id: 'contact', label: 'Contact', icon: Phone, desc: 'Contact & Social links' },
    { id: 'website', label: 'Website', icon: Layout, desc: 'Hero & CV content' },
    { id: 'seo', label: 'SEO', icon: Search, desc: 'Meta tags & Favicon' },
    { id: 'security', label: 'Security', icon: Shield, desc: 'Passwords & 2FA' },
    { id: 'services', label: 'Services', icon: Settings, desc: 'Service Management' },
    { id: 'storage', label: 'RustFS Storage', icon: HardDrive, desc: 'S3-Compatible CDN Storage' },
    { id: 'database', label: 'Managed DB (K3s)', icon: Database, desc: 'K3s Cluster, PMA, pgAdmin & Mongo' },
    { id: 'apps', label: 'Managed Apps (K8s)', icon: Boxes, desc: 'K3s Cluster & Let\'s Encrypt SSL for Apps' },
  ];

  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [setup2FAData, setSetup2FAData] = useState<{ url: string, secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState("");
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showDeleteCVModal, setShowDeleteCVModal] = useState(false);
  const [isDeletingCV, setIsDeletingCV] = useState(false);
  const [isDeletingFavicon, setIsDeletingFavicon] = useState(false);
  const [showDeleteFaviconModal, setShowDeleteFaviconModal] = useState(false);
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [faviconKey, setFaviconKey] = useState(0); // to force refresh image
  useEffect(() => { setFaviconKey(Date.now()); }, []);

  // RustFS State
  const [testingRustFS, setTestingRustFS] = useState(false);
  const [rustFSTestResult, setRustFSTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Target Server / Bucket Migration State
  const [targetConfig, setTargetConfig] = useState({
    endpoint: "",
    cdnBucket: "masdika-cdn",
    mediaBucket: "masdika-media",
    ticketBucket: "masdika-ticket",
    accessKey: "",
    secretKey: ""
  });
  const [showTargetSecretKey, setShowTargetSecretKey] = useState(false);
  const [testingTarget, setTestingTarget] = useState(false);
  const [targetTestResult, setTargetTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [migratingBucket, setMigratingBucket] = useState(false);
  const [deleteSourceAfterTransfer, setDeleteSourceAfterTransfer] = useState(false);
  const [updateActiveConfigAfterTransfer, setUpdateActiveConfigAfterTransfer] = useState(true);
  const [bucketMigrationResult, setBucketMigrationResult] = useState<any | null>(null);

  // Managed Database (K3s) State
  const [testingK3s, setTestingK3s] = useState(false);
  const [k3sTestResult, setK3sTestResult] = useState<{ success: boolean; message: string; latencyMs?: number; nodes?: string[] } | null>(null);
  const [showK3sPassword, setShowK3sPassword] = useState(false);

  // Managed Apps (K8s) State
  const [testingAppK3s, setTestingAppK3s] = useState(false);
  const [appK3sTestResult, setAppK3sTestResult] = useState<{ success: boolean; message: string; latencyMs?: number; nodes?: string[] } | null>(null);



  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    twoFactorEnabled: false,
    profileImage: "",
    social_facebook: "",
    social_twitter: "",
    social_linkedin: "",
    social_instagram: "",
    social_github: "",
    contact_email: "",
    contact_location: "",
    contact_phone: "",
    hero_title: "",
    hero_description: "",
    hero_typing_text: "",
    cv_url: "",
    meta_description: "",
    meta_description_blog: "",
    meta_description_portfolio: "",
    meta_description_services: "",
    meta_description_opportunities: "",
    meta_description_resume: "",
    meta_description_contact: "",
    meta_description_community: "",
    meta_description_events: "",
    meta_description_vacancies: "",
    maintenance_mode: false,
    maintenance_message: "We are currently performing scheduled maintenance. Please check back soon.",

    vps_enabled: true,
    k3s_enabled: true,
    cdn_enabled: true,
    tax_rate: "0",

    rustfs_endpoint: "",
    rustfs_access_key: "",
    rustfs_secret_key: "",
    rustfs_cdn_bucket: "masdika-cdn",
    rustfs_bucket: "masdika-cdn",
    rustfs_media_bucket: "masdika-media",
    rustfs_ticket_bucket: "masdika-ticket",
    rustfs_enabled: false,

    // Managed Database (Kubernetes API) Cluster Settings
    managed_db_auth_mode: "KUBECONFIG",
    managed_db_api_server: "",
    managed_db_kubeconfig: "",
    managed_db_service_token: "",
    managed_db_skip_tls: true,
    managed_db_ca_cert: "",
    managed_db_public_domain: "",
    managed_db_public_ip: "",
    managed_db_pma_url: "",
    managed_db_pgadmin_url: "",
    managed_db_mongo_url: "",

    // Managed Apps (Kubernetes API) Cluster Settings
    managed_app_auth_mode: "KUBECONFIG",
    managed_app_api_server: "https://192.168.79.17:6443",
    managed_app_kubeconfig: "",
    managed_app_service_token: "",
    managed_app_skip_tls: true,
    managed_app_ca_cert: "",
    managed_app_public_domain: "app.masdika.id",
    managed_app_public_ip: "103.247.10.61"
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setFormData({
            name: data.user?.name || "",
            email: data.user?.email || "",
            bio: data.settings?.bio || "",
            twoFactorEnabled: data.settings?.twoFactorEnabled === "true",
            profileImage: data.settings?.profileImage || "",
            social_facebook: data.settings?.social_facebook || "",
            social_twitter: data.settings?.social_twitter || "",
            social_linkedin: data.settings?.social_linkedin || "",
            social_instagram: data.settings?.social_instagram || "",
            social_github: data.settings?.social_github || "",
            contact_email: data.settings?.contact_email || "",
            contact_location: data.settings?.contact_location || "",
            contact_phone: data.settings?.contact_phone || "",
            hero_title: data.settings?.hero_title || "Hi, I'm Masdika,",
            hero_description: data.settings?.hero_description || "Specializing in resilient cloud infrastructure, DevOps automation, and self-hosted cloud services. Powering modern applications with high-performance VPS, Managed Kubernetes, File CDN, and developer tools.",
            hero_typing_text: data.settings?.hero_typing_text || "Cloud Engineer, DevOps Expert, SysAdmin Pro, Backend Dev",
            cv_url: data.settings?.cv_url || "",
            meta_description: data.settings?.meta_description || "",
            meta_description_blog: data.settings?.meta_description_blog || "",
            meta_description_portfolio: data.settings?.meta_description_portfolio || "",
            meta_description_services: data.settings?.meta_description_services || "",
            meta_description_opportunities: data.settings?.meta_description_opportunities || "",
            meta_description_resume: data.settings?.meta_description_resume || "",
            meta_description_contact: data.settings?.meta_description_contact || "",
            meta_description_community: data.settings?.meta_description_community || "",
            meta_description_events: data.settings?.meta_description_events || "",
            meta_description_vacancies: data.settings?.meta_description_vacancies || "",
            maintenance_mode: data.settings?.maintenance_mode === "true",
            maintenance_message: data.settings?.maintenance_message || "We are currently performing scheduled maintenance. Please check back soon.",

            vps_enabled: data.settings?.vps_enabled !== "false",
            k3s_enabled: data.settings?.k3s_enabled !== "false",
            cdn_enabled: data.settings?.cdn_enabled !== "false",
            tax_rate: data.settings?.tax_rate || "0",

            rustfs_endpoint: data.settings?.rustfs_endpoint || "",
            rustfs_access_key: data.settings?.rustfs_access_key || "",
            rustfs_secret_key: data.settings?.rustfs_secret_key || "",
            rustfs_cdn_bucket: data.settings?.rustfs_cdn_bucket || data.settings?.rustfs_bucket || "masdika-cdn",
            rustfs_bucket: data.settings?.rustfs_cdn_bucket || data.settings?.rustfs_bucket || "masdika-cdn",
            rustfs_media_bucket: data.settings?.rustfs_media_bucket || "masdika-media",
            rustfs_ticket_bucket: data.settings?.rustfs_ticket_bucket || "masdika-ticket",
            rustfs_enabled: data.settings?.rustfs_enabled !== undefined ? (data.settings.rustfs_enabled === "true" || data.settings.rustfs_enabled === true) : false,

            managed_db_auth_mode: data.settings?.managed_db_auth_mode || "KUBECONFIG",
            managed_db_api_server: data.settings?.managed_db_api_server || "",
            managed_db_kubeconfig: data.settings?.managed_db_kubeconfig || "",
            managed_db_service_token: data.settings?.managed_db_service_token || "",
            managed_db_skip_tls: data.settings?.managed_db_skip_tls !== undefined ? (data.settings.managed_db_skip_tls === "true" || data.settings.managed_db_skip_tls === true) : true,
            managed_db_ca_cert: data.settings?.managed_db_ca_cert || "",
            managed_db_public_domain: data.settings?.managed_db_public_domain || "",
            managed_db_public_ip: data.settings?.managed_db_public_ip || "",
            managed_db_pma_url: data.settings?.managed_db_pma_url || "",
            managed_db_pgadmin_url: data.settings?.managed_db_pgadmin_url || "",
            managed_db_mongo_url: data.settings?.managed_db_mongo_url || "",

            managed_app_auth_mode: data.settings?.managed_app_auth_mode || "KUBECONFIG",
            managed_app_api_server: data.settings?.managed_app_api_server || "https://192.168.79.17:6443",
            managed_app_kubeconfig: data.settings?.managed_app_kubeconfig || "",
            managed_app_service_token: data.settings?.managed_app_service_token || "",
            managed_app_skip_tls: data.settings?.managed_app_skip_tls !== undefined ? (data.settings.managed_app_skip_tls === "true" || data.settings.managed_app_skip_tls === true) : true,
            managed_app_ca_cert: data.settings?.managed_app_ca_cert || "",
            managed_app_public_domain: data.settings?.managed_app_public_domain || "app.masdika.id",
            managed_app_public_ip: data.settings?.managed_app_public_ip || "103.247.10.61"
          });
          if (data.settings?.profileImage) {
            setProfilePreview(data.settings?.profileImage);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        toast.error("Failed to load settings");
        setLoading(false);
      });
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setProfilePreview(url);

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
        toast.success("Profile photo selected! Don't forget to click Save Profile.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteProfilePhoto = async () => {
    setIsDeletingProfile(true);
    try {
      // Send empty profileImage to API — this deletes the old file from disk + clears DB
      const { twoFactorEnabled: _ignore2FA, ...safePayload } = formData;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...safePayload, profileImage: '' })
      });

      if (res.ok) {
        setProfilePreview(null);
        setFormData(prev => ({ ...prev, profileImage: '' }));
        toast.success('Profile photo has been permanently deleted!');
        window.dispatchEvent(new Event('profileUpdated'));
      } else {
        toast.error('Failed to delete profile photo.');
      }
    } catch (err) {
      toast.error('An error occurred while deleting profile photo.');
    } finally {
      setIsDeletingProfile(false);
      setShowDeleteProfileModal(false);
    }
  };

  const handleTestRustFS = async () => {
    setTestingRustFS(true);
    setRustFSTestResult(null);
    const toastId = toast.loading("Testing connection to RustFS...");
    try {
      const res = await fetch('/api/admin/rustfs/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: formData.rustfs_endpoint,
          accessKey: formData.rustfs_access_key,
          secretKey: formData.rustfs_secret_key,
          bucket: formData.rustfs_bucket,
          mediaBucket: formData.rustfs_media_bucket,
          ticketBucket: formData.rustfs_ticket_bucket,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
        setRustFSTestResult({ success: true, message: data.message });
      } else {
        toast.error(data.message || "Connection failed", { id: toastId });
        setRustFSTestResult({ success: false, message: data.message || "Failed to connect to RustFS" });
      }
    } catch (e: any) {
      toast.error(e?.message || "Connection failed", { id: toastId });
      setRustFSTestResult({ success: false, message: e?.message || "Connection failed" });
    } finally {
      setTestingRustFS(false);
    }
  };

  const handleTestK3s = async () => {
    setTestingK3s(true);
    setK3sTestResult(null);
    const toastId = toast.loading("Connecting to Kubernetes API (port 6443) & verifying cluster nodes...");
    try {
      const res = await fetch('/api/admin/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiServer: formData.managed_db_api_server,
          kubeconfig: formData.managed_db_kubeconfig,
          serviceToken: formData.managed_db_service_token,
          skipTlsVerify: formData.managed_db_skip_tls,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
        setK3sTestResult({ success: true, message: data.message, latencyMs: data.latencyMs, nodes: data.nodes });
      } else {
        toast.error(data.message || "Connection failed", { id: toastId });
        setK3sTestResult({ success: false, message: data.message || "Failed to connect to Kubernetes cluster", latencyMs: data.latencyMs });
      }
    } catch (e: any) {
      toast.error(e?.message || "Connection failed", { id: toastId });
      setK3sTestResult({ success: false, message: e?.message || "Connection failed" });
    } finally {
      setTestingK3s(false);
    }
  };

  const handleTestAppK3s = async () => {
    setTestingAppK3s(true);
    setAppK3sTestResult(null);
    const toastId = toast.loading("Connecting to Managed Apps Kubernetes API (port 6443) & verifying cluster nodes...");
    try {
      const res = await fetch('/api/admin/apps/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiServer: formData.managed_app_api_server,
          kubeconfig: formData.managed_app_kubeconfig,
          serviceToken: formData.managed_app_service_token,
          skipTlsVerify: formData.managed_app_skip_tls,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
        setAppK3sTestResult({ success: true, message: data.message, latencyMs: data.latencyMs, nodes: data.nodes });
      } else {
        toast.error(data.message || "Connection failed", { id: toastId });
        setAppK3sTestResult({ success: false, message: data.message || "Failed to connect to Managed Apps cluster", latencyMs: data.latencyMs });
      }
    } catch (e: any) {
      toast.error(e?.message || "Connection failed", { id: toastId });
      setAppK3sTestResult({ success: false, message: e?.message || "Connection failed" });
    } finally {
      setTestingAppK3s(false);
    }
  };

  const handleTestTargetRustFS = async () => {
    if (!targetConfig.endpoint || !targetConfig.accessKey || !targetConfig.secretKey) {
      toast.error("Please fill in target endpoint, access key, and secret key first.");
      return;
    }
    setTestingTarget(true);
    setTargetTestResult(null);
    const toastId = toast.loading("Testing connection to target RustFS server & verifying all 3 buckets...");
    try {
      const res = await fetch('/api/admin/rustfs/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: targetConfig.endpoint,
          accessKey: targetConfig.accessKey,
          secretKey: targetConfig.secretKey,
          cdnBucket: targetConfig.cdnBucket || 'masdika-cdn',
          mediaBucket: targetConfig.mediaBucket || 'masdika-media',
          ticketBucket: targetConfig.ticketBucket || 'masdika-ticket',
          bucket: targetConfig.cdnBucket || 'masdika-cdn'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
        setTargetTestResult({ success: true, message: data.message });
      } else {
        toast.error(data.message || "Connection to target server failed", { id: toastId });
        setTargetTestResult({ success: false, message: data.message || "Connection failed" });
      }
    } catch (e: any) {
      toast.error(e?.message || "Connection to target server failed", { id: toastId });
      setTargetTestResult({ success: false, message: e?.message || "Connection failed" });
    } finally {
      setTestingTarget(false);
    }
  };

  const handleMigrateBucket = async () => {
    if (!targetConfig.endpoint || !targetConfig.accessKey || !targetConfig.secretKey) {
      toast.error("Please fill in all target server credentials (endpoint, access key, secret key) before migrating.");
      return;
    }

    const cdnB = targetConfig.cdnBucket || 'masdika-cdn';
    const mediaB = targetConfig.mediaBucket || 'masdika-media';
    const ticketB = targetConfig.ticketBucket || 'masdika-ticket';

    setMigratingBucket(true);
    setBucketMigrationResult(null);
    const toastId = toast.loading("Transferring CDN, Media, and Ticket files to target server... please wait");
    try {
      const res = await fetch('/api/admin/rustfs/migrate-bucket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: {
            endpoint: targetConfig.endpoint,
            accessKey: targetConfig.accessKey,
            secretKey: targetConfig.secretKey,
            cdnBucket: cdnB,
            mediaBucket: mediaB,
            ticketBucket: ticketB,
            bucket: cdnB
          },
          deleteSourceAfterTransfer,
          updateActiveConfig: updateActiveConfigAfterTransfer
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
        setBucketMigrationResult(data.result);
        if (updateActiveConfigAfterTransfer) {
          setFormData(prev => ({
            ...prev,
            rustfs_endpoint: targetConfig.endpoint,
            rustfs_cdn_bucket: cdnB,
            rustfs_bucket: cdnB,
            rustfs_media_bucket: mediaB,
            rustfs_ticket_bucket: ticketB,
            rustfs_access_key: targetConfig.accessKey,
            rustfs_secret_key: targetConfig.secretKey,
            rustfs_enabled: true
          }));
        }
      } else {
        toast.error(data.message || "Migration failed", { id: toastId });
        setBucketMigrationResult({ error: data.message });
      }
    } catch (e: any) {
      toast.error(e?.message || "Migration failed", { id: toastId });
      setBucketMigrationResult({ error: e?.message });
    } finally {
      setMigratingBucket(false);
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Maximum file size is 10MB.");
        return;
      }
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "cv");

      const loadingToast = toast.loading("Uploading CV...");
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: uploadData
        });
        const data = await res.json();
        if (data.url) {
          setFormData(prev => ({ ...prev, cv_url: data.url }));
          toast.success("CV uploaded successfully! Don't forget to click Save.", { id: loadingToast });
        } else {
          toast.error(data.error || "Failed to upload CV.", { id: loadingToast });
        }
      } catch (err) {
        toast.error("An error occurred.", { id: loadingToast });
      }
    }
  };

  const handleDeleteCV = async () => {
    if (!formData.cv_url) return;

    setIsDeletingCV(true);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.cv_url })
      });

      if (res.ok) {
        setFormData(prev => ({ ...prev, cv_url: "" }));

        // Auto-save to database so it stays deleted even after refresh
        await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, cv_url: "" })
        });

        toast.success("CV has been permanently deleted!");
        setShowDeleteCVModal(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete CV.");
      }
    } catch (err) {
      toast.error("An error occurred while deleting CV.");
    } finally {
      setIsDeletingCV(false);
    }
  };


  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".ico")) {
        toast.error("Only .ico files are allowed for Favicon.");
        return;
      }

      const uploadData = new FormData();
      uploadData.append("file", file);

      const loadingToast = toast.loading("Uploading Favicon...");
      try {
        const res = await fetch('/api/admin/settings/favicon', {
          method: 'POST',
          body: uploadData
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Favicon uploaded successfully!", { id: loadingToast });
          setFaviconKey(Date.now());
        } else {
          toast.error(data.error || "Failed to upload Favicon.", { id: loadingToast });
        }
      } catch (err) {
        toast.error("An error occurred.", { id: loadingToast });
      }
    }
  };

  const handleDeleteFavicon = async () => {
    setIsDeletingFavicon(true);
    try {
      const res = await fetch('/api/admin/settings/favicon', {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success("Favicon has been deleted from storage!");
        setFaviconKey(Date.now());
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete Favicon.");
      }
    } catch (err) {
      toast.error("An error occurred while deleting Favicon.");
    } finally {
      setIsDeletingFavicon(false);
      setShowDeleteFaviconModal(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle2FA = async () => {
    if (formData.twoFactorEnabled) {
      // Require 6-digit TOTP confirmation before disabling 2FA
      setShowDisable2FA(prev => !prev);
      setDisable2FACode("");
    } else {
      // It's OFF, start setup
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setup2FA: true })
        });
        const data = await res.json();

        if (data.success && data.otpauthUrl) {
          import('qrcode').then(QRCode => {
            QRCode.default.toDataURL(data.otpauthUrl, (err, url) => {
              if (!err) {
                setSetup2FAData({ url, secret: data.secret });
                // Do NOT set twoFactorEnabled to true yet! It stays false until verified.
              }
            });
          });
        } else {
          toast.error(data.error || "Failed to start 2FA setup");
        }
      } catch (err) {
        toast.error("An error occurred");
      }
    }
  };

  const handleConfirmDisable2FA = async () => {
    if (disable2FACode.length !== 6) {
      toast.error("Please enter your 6-digit authenticator code.");
      return;
    }
    setDisabling2FA(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twoFactorEnabled: false, disable2FACode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormData(prev => ({ ...prev, twoFactorEnabled: false }));
        setShowDisable2FA(false);
        setDisable2FACode("");
        toast.success("2FA has been disabled.");
      } else {
        toast.error(data.error || "Invalid 2FA verification code.");
      }
    } catch {
      toast.error("An error occurred while disabling 2FA.");
    } finally {
      setDisabling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    setVerifying2FA(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verify2FA: verifyCode })
      });
      const data = await res.json();

      if (data.success) {
        toast.success("2FA enabled successfully!");
        setFormData(prev => ({ ...prev, twoFactorEnabled: true }));
        setSetup2FAData(null);
        setVerifyCode("");
      } else {
        toast.error(data.error || "Invalid verification code.");
      }
    } catch (err) {
      toast.error("An error occurred during verification.");
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { twoFactorEnabled: _ignore2FA, ...safePayload } = formData;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safePayload)
      });

      if (res.ok) {
        toast.success("Settings updated successfully!");
        window.dispatchEvent(new Event('profileUpdated'));
      } else {
        toast.error("Failed to update settings");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error("New password cannot be the same as the current password!");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/admin/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password updated successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(data.error || "Failed to update password");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 pb-10 w-full relative z-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("relative overflow-hidden rounded-2xl border p-4 sm:p-5", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold mb-4 tracking-wide", isDark ? "text-cyan-400" : "text-cyan-700")}>
            <Settings className="w-3 h-3" /> Account Management
          </div>
          <h1 className={cn("text-xl sm:text-2xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            System <span className={cn(isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent" : "text-cyan-600")}>Settings</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your profile, website content, SEO, and security.</p>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-5 md:gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-60 lg:w-64 shrink-0 sticky top-0 md:top-4 z-20 min-w-0 py-2 -my-2 md:py-0 md:my-0 bg-[#f8fafb]/95 dark:bg-[#000000]/95 md:bg-transparent md:dark:bg-transparent backdrop-blur-md md:backdrop-blur-none transition-all">
          <div className={cn("border rounded-2xl p-1.5 sm:p-2 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible no-scrollbar", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "relative flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 rounded-xl transition-all text-left shrink-0 whitespace-nowrap md:whitespace-normal md:w-full border cursor-pointer",
                    isActive
                      ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25 shadow-xs" : "bg-cyan-50 text-cyan-800 border-cyan-200 shadow-2xs")
                      : (isDark ? "text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent")
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                    isActive
                      ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                      : (isDark ? "bg-white/5 border-white/[0.08] text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500")
                  )}>
                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  </div>
                  <div className="hidden md:block min-w-0">
                    <div className={cn("text-xs sm:text-sm font-bold leading-none truncate", isActive ? "text-white" : "text-zinc-300")}>{tab.label}</div>
                    <div className={cn("text-[10px] mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{tab.desc}</div>
                  </div>
                  <span className="md:hidden text-xs sm:text-sm font-bold tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* Profile Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 border-b border-cyan-500/10 pb-4 sm:pb-6 relative z-10">
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
                      <User className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>Profile Information</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Update your account details and profile photo.</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 md:gap-10 relative z-10">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group/avatar">
                        <div className={cn("w-36 h-36 rounded-full border-4 border-black overflow-hidden flex items-center justify-center group-hover/-[0_0_0_4px_rgba(6,182,212,0.5)] transition-all", isDark ? "bg-zinc-900" : "bg-slate-50")}>
                          {profilePreview ? (
                            <img referrerPolicy="no-referrer" src={profilePreview} alt="Profile" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <span className={cn("text-2xl sm:text-3xl font-bold", isDark ? "text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-cyan-600" : "text-cyan-600")}>
                              {formData.name ? formData.name.charAt(0).toUpperCase() : 'M'}
                            </span>
                          )}
                        </div>
                        <label className="absolute bottom-2 right-2 p-3 rounded-full bg-cyan-500 text-black cursor-pointer hover:bg-cyan-400 hover:scale-110 transition-all z-10">
                          <Camera className="w-4 h-4" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleProfileChange} />
                        </label>

                        <AnimatePresence>
                          {profilePreview && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              onClick={() => setShowDeleteProfileModal(true)}
                              disabled={isDeletingProfile}
                              className={cn("absolute top-2 right-2 p-2 rounded-full bg-red-500/90 cursor-pointer hover:bg-red-400 hover:scale-110 transition-all z-10 disabled:opacity-50", isDark ? "text-white" : "text-slate-900")}
                              title="Remove photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex flex-col items-center mt-2">
                        <span className={cn("text-xs font-bold tracking-widest uppercase", isDark ? "text-zinc-500" : "text-slate-500")}>Photo</span>
                        <span className="text-[10px] text-zinc-600 mt-1">Recommended: 1:1 (Max 5MB)</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className={labelClass}>Display Name</label>
                          <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Email Address</label>
                          <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Bio</label>
                        <textarea rows={4} name="bio" value={formData.bio} onChange={handleChange} className={cn(inputClass, "resize-none")} />
                      </div>

                      <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                        <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                          {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                          {saving ? "Saving..." : "Save Profile"}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'contact' && (
              <motion.div key="contact" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* Contact Information Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex items-start sm:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-6 relative z-10 mb-6 sm:mb-8", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
                      <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>Contact Information</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Update the contact details on your Contact page.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-2">
                      <label className={labelClass}>Contact Email</label>
                      <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} placeholder="me@masdika.id" className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Phone Number</label>
                      <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleChange} placeholder="+62 823 3162 3374" className={inputClass} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className={labelClass}>Location</label>
                      <input type="text" name="contact_location" value={formData.contact_location} onChange={handleChange} placeholder="Surabaya, Indonesia" className={inputClass} />
                    </div>
                  </div>
                  <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                      {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save Contact Info"}
                    </button>
                  </div>
                </motion.div>
                {/* Social Links Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex items-start sm:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-6 relative z-10 mb-6 sm:mb-8", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
                      <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>Social Media Links</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Update the links that appear in your Navbar and Footer.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-2">
                      <label className={labelClass}>Facebook</label>
                      <input type="url" name="social_facebook" value={formData.social_facebook} onChange={handleChange} placeholder="https://facebook.com/..." className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>X (Twitter)</label>
                      <input type="url" name="social_twitter" value={formData.social_twitter} onChange={handleChange} placeholder="https://twitter.com/..." className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>LinkedIn</label>
                      <input type="url" name="social_linkedin" value={formData.social_linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Instagram</label>
                      <input type="url" name="social_instagram" value={formData.social_instagram} onChange={handleChange} placeholder="https://instagram.com/..." className={inputClass} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className={labelClass}>GitHub</label>
                      <input type="url" name="social_github" value={formData.social_github} onChange={handleChange} placeholder="https://github.com/..." className={inputClass} />
                    </div>
                  </div>
                  <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                      {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save Social Links"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'website' && (
              <motion.div key="website" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* Website Content Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex items-start sm:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-6 relative z-10 mb-6 sm:mb-8", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
                      <Layout className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>Website Content</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Update the hero section on your homepage.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 relative z-10">
                    <div className="space-y-2">
                      <label className={labelClass}>Hero Title</label>
                      <input type="text" name="hero_title" value={formData.hero_title} onChange={handleChange} placeholder="Hi, I'm Masdika," className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Hero Description</label>
                      <textarea rows={3} name="hero_description" value={formData.hero_description} onChange={handleChange} placeholder="Specializing in highly available cloud..." className={cn(inputClass, "resize-none")} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Hero Typing Text (Comma separated)</label>
                      <input type="text" name="hero_typing_text" value={formData.hero_typing_text} onChange={handleChange} placeholder="Cloud Engineer, DevOps Expert, SysAdmin Pro, Backend Dev" className={inputClass} />
                    </div>
                  </div>
                  <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                      {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save Content"}
                    </button>
                  </div>
                </motion.div>
                {/* Resume / CV Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex items-start sm:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-6 relative z-10 mb-6 sm:mb-8", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>Resume / CV</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Upload your latest CV (PDF format, max 10MB).</p>
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <label className={cn("relative inline-flex items-center justify-center w-full sm:w-auto px-6 sm:px-8 py-3 border hover:border-cyan-500/50 rounded-xl font-bold cursor-pointer transition-all text-xs sm:text-sm", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white hover:border-slate-700" : "bg-white border-slate-200 text-slate-900 hover:border-slate-300")}>
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleCVUpload} />
                        <FileText className={cn("w-4 h-4 mr-2", isDark ? "text-cyan-400" : "text-cyan-700")} />
                        Upload New CV
                      </label>
                      {formData.cv_url && (
                        <div className="flex items-center gap-3">
                          <a href={formData.cv_url} target="_blank" rel="noopener noreferrer" className={cn("hover:text-cyan-300 font-bold text-xs sm:text-sm underline underline-offset-4 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}>
                            View Current CV
                          </a>
                          <button
                            onClick={() => setShowDeleteCVModal(true)}
                            className={cn("p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors", isDark ? "text-red-500" : "text-red-700")}
                            title="Delete CV from storage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                      {formData.cv_url ? `Current CV path: ${formData.cv_url}` : "No CV uploaded yet."}
                    </p>
                  </div>
                  <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                      {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save CV"}
                    </button>
                  </div>
                </motion.div>


              </motion.div>
            )}

            {activeTab === 'seo' && (
              <motion.div key="seo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* SEO & Favicon Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex items-start sm:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-6 relative z-10 mb-6 sm:mb-8", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
                      <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>SEO & Favicon</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your website's meta description and favicon.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 relative z-10">
                    <div className="space-y-4">
                      <h3 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Page Meta Descriptions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className={labelClass}>Home Page</label>
                          <textarea rows={2} name="meta_description" value={formData.meta_description} onChange={handleChange} placeholder="Portfolio of Masdika..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Blog Page</label>
                          <textarea rows={2} name="meta_description_blog" value={formData.meta_description_blog} onChange={handleChange} placeholder="Read the latest articles..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Portfolio Page</label>
                          <textarea rows={2} name="meta_description_portfolio" value={formData.meta_description_portfolio} onChange={handleChange} placeholder="Check out my recent projects..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Services Page</label>
                          <textarea rows={2} name="meta_description_services" value={formData.meta_description_services} onChange={handleChange} placeholder="Professional services including..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Opportunities Page</label>
                          <textarea rows={2} name="meta_description_opportunities" value={formData.meta_description_opportunities} onChange={handleChange} placeholder="Explore career and learning opportunities..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Resume Page</label>
                          <textarea rows={2} name="meta_description_resume" value={formData.meta_description_resume} onChange={handleChange} placeholder="My professional experience and education..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Contact Page</label>
                          <textarea rows={2} name="meta_description_contact" value={formData.meta_description_contact} onChange={handleChange} placeholder="Get in touch with me..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Community Page</label>
                          <textarea rows={2} name="meta_description_community" value={formData.meta_description_community} onChange={handleChange} placeholder="Join our tech community..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Events Page</label>
                          <textarea rows={2} name="meta_description_events" value={formData.meta_description_events} onChange={handleChange} placeholder="Explore the latest events..." className={cn(inputClass, "resize-none")} />
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Vacancies Page</label>
                          <textarea rows={2} name="meta_description_vacancies" value={formData.meta_description_vacancies} onChange={handleChange} placeholder="Discover the best career opportunities..." className={cn(inputClass, "resize-none")} />
                        </div>
                      </div>
                    </div>

                    <div className={cn("space-y-4 pt-6 mt-6 border-t", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                      <label className={labelClass}>Favicon (.ico only)</label>
                      <div className="flex items-center gap-6">
                        <div className={cn("w-16 h-16 rounded-xl border flex items-center justify-center overflow-hidden relative", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                          <img referrerPolicy="no-referrer" src={`/favicon.ico?v=${faviconKey}`} alt="Favicon" className="w-8 h-8" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgY3Vyc29yPSJwb2ludGVyIj48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMSIgLz48L3N2Zz4=' }} />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className={cn("flex flex-col items-center justify-center px-6 py-2 border hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200")}>
                            <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>Upload .ico</span>
                            <span className={cn("text-[10px] mt-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>Recommended: 32x32px</span>
                            <input type="file" accept=".ico" className="hidden" onChange={handleFaviconUpload} />
                          </label>
                          <button
                            onClick={() => setShowDeleteFaviconModal(true)}
                            disabled={isDeletingFavicon}
                            className={cn("p-2.5 rounded-xl transition-all border shrink-0", isDark ? "bg-[#0a0a0c] hover:bg-slate-800 text-white border-white/[0.08]" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}
                            title="Delete Favicon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className={cn("p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all shadow-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                        <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                        <p className={cn("leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-600")}>
                          <strong className={cn("font-medium mr-1", isDark ? "text-cyan-400" : "text-cyan-900")}>Note:</strong>
                          Browsers cache favicons heavily. Press CTRL + F5 after uploading to see the change.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                      {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save SEO Settings"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* Security Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 border-b border-cyan-500/10 pb-4 sm:pb-6 relative z-10">
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")} >
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>Security & 2FA</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your password and Two-Factor Authentication.</p>
                    </div>
                  </div>

                  <div className="space-y-8 relative z-10">
                    <div className="flex flex-col gap-4">
                      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border transition-colors group", isDark ? "bg-[#0a0a0c] border-white/[0.08] hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300")}>
                        <div>
                          <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                            <Key className={cn("w-4 h-4 group-hover:rotate-12 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            Two-Factor Authentication
                          </h3>
                          <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Add an extra layer of security to your account. This setting saves automatically when toggled.</p>
                        </div>

                        <button
                          onClick={handleToggle2FA}
                          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${formData.twoFactorEnabled ? 'bg-cyan-400' : (isDark ? 'bg-slate-800' : 'bg-slate-300')}`}
                        >
                          <span className="sr-only">Use setting</span>
                          <span aria-hidden="true" className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-950 ring-0 transition duration-200 ease-in-out ${formData.twoFactorEnabled ? 'translate-x-3 bg-slate-950' : '-translate-x-3 bg-white'}`} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {showDisable2FA && formData.twoFactorEnabled && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={cn("p-6 rounded-2xl border flex flex-col items-center gap-4 text-center", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                              <p className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-600")}>Enter your 6-digit Authenticator code to disable Two-Factor Authentication</p>
                              <div className="w-full max-w-sm space-y-4">
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={disable2FACode}
                                  onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, ''))}
                                  placeholder="123456"
                                  className={cn("w-full px-5 py-3.5 border rounded-xl text-center tracking-[0.5em] text-xl font-bold focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                                />
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => { setShowDisable2FA(false); setDisable2FACode(""); }}
                                    className={cn("flex-1 py-2.5 font-semibold text-xs rounded-lg transition-colors border", isDark ? "text-slate-300 border-white/[0.08] bg-[#0a0a0c] hover:bg-slate-800" : "text-slate-700 border-slate-200 bg-white hover:bg-slate-50")}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleConfirmDisable2FA}
                                    disabled={disable2FACode.length !== 6 || disabling2FA}
                                    className="flex-1 py-2.5 px-3.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 bg-red-500 hover:bg-red-400 active:bg-red-600 text-white shadow-sm"
                                  >
                                    {disabling2FA ? "Disabling..." : "Confirm Disable 2FA"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        {setup2FAData && !formData.twoFactorEnabled && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={cn("p-8 rounded-2xl border flex flex-col items-center gap-6 text-center", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                              <p className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-600")}>1. Scan this QR Code with your Authenticator app</p>
                              <div className="p-4 bg-white rounded-2xl">
                                <img referrerPolicy="no-referrer" src={setup2FAData.url} alt="2FA QR Code" className="w-48 h-48" loading="lazy" decoding="async" />
                              </div>

                              <div className="space-y-1">
                                <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Or enter the secret key manually:</p>
                                <p className={cn("text-sm font-bold tracking-widest", isDark ? "text-white" : "text-slate-900")}>{setup2FAData.secret}</p>
                              </div>

                              <div className={cn("w-full max-w-sm h-px my-2", isDark ? "bg-slate-800" : "bg-slate-200")} />

                              <div className="w-full max-w-sm space-y-4">
                                <p className={cn("text-sm font-semibold text-left", isDark ? "text-zinc-300" : "text-slate-600")}>2. Enter the 6-digit code from the app</p>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={verifyCode}
                                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                  placeholder="123456"
                                  className={cn("w-full px-5 py-4 border rounded-xl text-center tracking-[0.5em] text-2xl font-bold focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                                />

                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setSetup2FAData(null)}
                                    className={cn("flex-1 py-3.5 font-bold rounded-xl transition-colors border", isDark ? "text-slate-300 border-white/[0.08] bg-[#0a0a0c] hover:bg-slate-800" : "text-slate-700 border-slate-200 bg-white hover:bg-slate-50")}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleVerify2FA}
                                    disabled={verifyCode.length !== 6 || verifying2FA}
                                    className="flex-1 py-2 px-3.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
                                  >
                                    {verifying2FA ? "Verifying..." : "Verify"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className={cn("space-y-6 w-full p-6 rounded-2xl border", isDark ? "border-white/[0.08] bg-[#0a0a0c]" : "border-slate-200 bg-slate-50")}>
                      <h3 className={cn("font-bold text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>Change Password</h3>
                      <div className="space-y-3">
                        <label className={labelClass}>Current Password</label>
                        <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="••••••••" className={cn("w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white placeholder:text-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")} />
                      </div>
                      <div className="space-y-3">
                        <label className={labelClass}>New Password</label>
                        <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="••••••••" className={cn("w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white placeholder:text-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")} />
                      </div>
                      <div className="space-y-3">
                        <label className={labelClass}>Confirm New Password</label>
                        <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="••••••••" className={cn("w-full px-3.5 py-2 border rounded-xl focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white placeholder:text-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")} />
                      </div>
                      <button
                        onClick={handleUpdatePassword}
                        disabled={passwordSaving}
                        className={cn("flex items-center justify-center w-full px-3.5 py-2 font-bold rounded-xl transition-colors border mt-2 disabled:opacity-50", isDark ? "text-white border-white/[0.08] bg-[#0c0c0e] hover:bg-slate-800" : "text-slate-900 border-slate-200 bg-white hover:bg-slate-100")}
                      >
                        {passwordSaving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : "Update Password"}
                      </button>
                    </div>
                  </div>
                </motion.div>


                {/* System Maintenance Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex items-start sm:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-6 relative z-10 mb-6 sm:mb-8", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>System Maintenance</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Put the customer panel in maintenance mode. Admins can still access the dashboard.</p>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-20">
                    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border transition-colors group", isDark ? "bg-white/5 border-cyan-500/10 hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-500/30")}>
                      <div className="pr-4">
                        <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          <Shield className={cn("w-4 h-4 group-hover:rotate-12 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} />
                          Enable Maintenance Mode
                        </h3>
                        <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>When enabled, customers will see a maintenance screen instead of their dashboard. You (Admin) will still have full access.</p>
                      </div>

                      <button
                        onClick={() => setFormData({ ...formData, maintenance_mode: !formData.maintenance_mode })}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black ${formData.maintenance_mode ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                      >
                        <span className="sr-only">Toggle Maintenance Mode</span>
                        <span aria-hidden="true" className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.maintenance_mode ? 'translate-x-3' : '-translate-x-3'}`} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className={labelClass}>Maintenance Message</label>
                      <textarea
                        name="maintenance_message"
                        value={formData.maintenance_message}
                        onChange={handleChange}
                        rows={3}
                        placeholder="We are currently performing scheduled maintenance. Please check back soon."
                        className={cn(inputClass, "resize-none")}
                      />
                    </div>
                  </div>
                  <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                      {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save Maintenance Settings"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'services' && (
              <motion.div key="services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">

                {/* Service Management */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex items-start sm:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-6 relative z-10 mb-6 sm:mb-8", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
                      <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>Service Management</h2>
                      <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Enable or disable specific services. Disabled services will show as "Coming Soon".</p>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-20">
                    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border transition-colors group", isDark ? "bg-white/5 border-cyan-500/10 hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-500/30")}>
                      <div className="pr-4">
                        <h3 className={cn("font-bold flex items-center gap-2 text-base sm:text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          <Settings className={cn("w-4 h-4 group-hover:rotate-45 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} />
                          Enable Cloud VPS
                        </h3>
                        <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>When disabled, customers cannot deploy new Cloud VPS instances. The frontend will display "Coming Soon".</p>
                      </div>

                      <button
                        onClick={() => setFormData({ ...formData, vps_enabled: !formData.vps_enabled })}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black ${formData.vps_enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                      >
                        <span className="sr-only">Toggle Cloud VPS</span>
                        <span aria-hidden="true" className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.vps_enabled ? 'translate-x-3' : '-translate-x-3'}`} />
                      </button>
                    </div>

                    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border transition-colors group", isDark ? "bg-white/5 border-cyan-500/10 hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-500/30")}>
                      <div className="pr-4">
                        <h3 className={cn("font-bold flex items-center gap-2 text-base sm:text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          <Rocket className={cn("w-4 h-4 group-hover:rotate-45 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} />
                          Enable 1-Click Apps
                        </h3>
                        <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>When disabled, customers cannot deploy new 1-Click Applications.</p>
                      </div>

                      <button
                        onClick={() => setFormData({ ...formData, k3s_enabled: !formData.k3s_enabled })}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black ${formData.k3s_enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                      >
                        <span className="sr-only">Toggle 1-Click Apps</span>
                        <span aria-hidden="true" className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.k3s_enabled ? 'translate-x-3' : '-translate-x-3'}`} />
                      </button>
                    </div>



                    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border transition-colors group", isDark ? "bg-white/5 border-cyan-500/10 hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-500/30")}>
                      <div className="pr-4">
                        <h3 className={cn("font-bold flex items-center gap-2 text-base sm:text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          <Settings className={cn("w-4 h-4 group-hover:rotate-45 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} />
                          Enable CDN
                        </h3>
                        <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>When disabled, customers cannot order new CDN plans. The frontend will display "Coming Soon".</p>
                      </div>

                      <button
                        onClick={() => setFormData({ ...formData, cdn_enabled: !formData.cdn_enabled })}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black ${formData.cdn_enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                      >
                        <span className="sr-only">Toggle CDN</span>
                        <span aria-hidden="true" className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.cdn_enabled ? 'translate-x-3' : '-translate-x-3'}`} />
                      </button>
                    </div>

                    <div className={cn("space-y-3 mt-6 pt-6 border-t", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                      <label className={labelClass}>Global PPN (Tax Rate %)</label>
                      <p className={cn("text-sm mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Set the global tax rate (e.g. 11 for 11%). This tax is applied when customers Top Up their balance.</p>
                      <input
                        type="number"
                        name="tax_rate"
                        value={formData.tax_rate}
                        onChange={handleChange}
                        placeholder="11"
                        min="0"
                        max="100"
                        className={cn(inputClass, "w-full sm:w-1/3")}
                      />
                    </div>

                  </div>
                  <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                      {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save Service Settings"}
                    </button>
                  </div>
                </motion.div>


              </motion.div>
            )}

            {activeTab === 'storage' && (
              <motion.div key="storage" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* RustFS Configuration Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 sm:pb-6 relative z-10", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                      <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                        <HardDrive className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>RustFS S3 Object Storage</h2>
                        <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Distributed S3-compatible high-performance object storage for File CDN & videos.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleTestRustFS}
                        disabled={testingRustFS}
                        className={cn("w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700")}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", testingRustFS && "animate-spin")} />
                        <span>{testingRustFS ? "Testing..." : "Test Connection"}</span>
                      </button>
                    </div>
                  </div>

                  {rustFSTestResult && (
                    <div className={cn("p-4 rounded-xl border flex items-start gap-3", rustFSTestResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400")}>
                      {rustFSTestResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                      <div className="text-xs md:text-sm">
                        <span className="font-bold">{rustFSTestResult.success ? "Connection Verified" : "Connection Failed"}: </span>
                        <span>{rustFSTestResult.message}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6 relative z-20">
                    {/* Toggle Enable RustFS */}
                    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border transition-colors", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                      <div className="pr-4">
                        <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>Enable RustFS Storage</h3>
                        <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                          When enabled, all new videos and files are stored in RustFS. If disabled or unreachable, system seamlessly falls back to local disk storage.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, rustfs_enabled: !formData.rustfs_enabled })}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${formData.rustfs_enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
                      >
                        <span className="sr-only">Toggle RustFS</span>
                        <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.rustfs_enabled ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className={labelClass}>RustFS S3 Endpoint *</label>
                        <input
                          type="text"
                          name="rustfs_endpoint"
                          value={formData.rustfs_endpoint}
                          onChange={handleChange}
                          placeholder="http://192.168.x.x:9000 or https://s3.yourdomain.com"
                          className={inputClass}
                        />
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>IP or domain of your RustFS server with S3 port (e.g. http://192.168.x.x:9000)</p>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>File CDN Bucket Name *</label>
                        <input
                          type="text"
                          name="rustfs_bucket"
                          value={formData.rustfs_bucket}
                          onChange={handleChange}
                          placeholder="masdika-cdn"
                          className={inputClass}
                        />
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>Dedicated bucket for File CDN, encrypted videos & sold resources</p>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>Website Media Bucket Name *</label>
                        <input
                          type="text"
                          name="rustfs_media_bucket"
                          value={formData.rustfs_media_bucket}
                          onChange={handleChange}
                          placeholder="masdika-media"
                          className={inputClass}
                        />
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>Bucket for profile avatars, blog articles, banners & website uploads</p>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>Ticket Attachments Bucket *</label>
                        <input
                          type="text"
                          name="rustfs_ticket_bucket"
                          value={formData.rustfs_ticket_bucket}
                          onChange={handleChange}
                          placeholder="masdika-ticket"
                          className={inputClass}
                        />
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>Dedicated bucket for support ticket attachments (auto-created if not exists)</p>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>Access Key ID *</label>
                        <input
                          type="text"
                          name="rustfs_access_key"
                          value={formData.rustfs_access_key}
                          onChange={handleChange}
                          placeholder="Your RustFS Access Key"
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>Secret Access Key *</label>
                        <div className="relative">
                          <input
                            type={showSecretKey ? "text" : "password"}
                            name="rustfs_secret_key"
                            value={formData.rustfs_secret_key}
                            onChange={handleChange}
                            placeholder="••••••••••••••••"
                            className={cn(inputClass, "pr-10")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecretKey(!showSecretKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                          >
                            {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={cn("pt-6 border-t flex items-center justify-between flex-wrap gap-4", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Changes take effect immediately across all uploads and streaming routes.
                    </p>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 cursor-pointer"
                    >
                      {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? "Saving..." : "Save RustFS Settings"}
                    </button>
                  </div>
                </motion.div>



                {/* Cross-Server & Bucket Migration Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 sm:pb-6", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                      <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                        <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Cross-Server & Bucket Migration</h3>
                        <p className={cn("text-xs md:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Seamlessly transfer all media & videos between RustFS servers or buckets at any time.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Active Source Pill */}
                  <div className={cn("p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">Current Source Server & Active Buckets</span>
                      <p className={cn("font-mono text-xs font-semibold", isDark ? "text-zinc-200" : "text-slate-800")}>
                        {formData.rustfs_endpoint || "(Not configured)"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="px-2.5 py-1 rounded-md bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 text-[11px] font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          CDN: <strong className="font-mono">{formData.rustfs_cdn_bucket || formData.rustfs_bucket || 'masdika-cdn'}</strong>
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[11px] font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          Media: <strong className="font-mono">{formData.rustfs_media_bucket || 'masdika-media'}</strong>
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-blue-950/40 text-blue-300 border border-blue-800/40 text-[11px] font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          Tickets: <strong className="font-mono">{formData.rustfs_ticket_bucket || 'masdika-ticket'}</strong>
                        </span>
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold w-fit shrink-0", formData.rustfs_enabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", formData.rustfs_enabled ? "bg-emerald-400" : "bg-amber-400")} />
                      {formData.rustfs_enabled ? "Source Active" : "Source Disabled"}
                    </span>
                  </div>

                  {/* Target Server Destination Form */}
                  <div className="space-y-4">
                    <h4 className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-800")}>
                      Destination Server & Buckets Details (CDN, Media, and Tickets)
                    </h4>

                    {targetTestResult && (
                      <div className={cn("p-3.5 rounded-xl border text-xs flex items-center gap-2.5", targetTestResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                        {targetTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                        <span>{targetTestResult.message}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2 md:col-span-2">
                        <label className={labelClass}>Target RustFS S3 Endpoint *</label>
                        <input
                          type="text"
                          value={targetConfig.endpoint}
                          onChange={(e) => setTargetConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                          placeholder="http://new-ip:9000 or https://new-rustfs.domain.com"
                          className={inputClass}
                        />
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>IP or URL of the new RustFS server with S3 port</p>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>Target Access Key ID *</label>
                        <input
                          type="text"
                          value={targetConfig.accessKey}
                          onChange={(e) => setTargetConfig(prev => ({ ...prev, accessKey: e.target.value }))}
                          placeholder="New Access Key ID"
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>Target Secret Access Key *</label>
                        <div className="relative">
                          <input
                            type={showTargetSecretKey ? "text" : "password"}
                            value={targetConfig.secretKey}
                            onChange={(e) => setTargetConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                            placeholder="••••••••••••••••"
                            className={cn(inputClass, "pr-10")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowTargetSecretKey(!showTargetSecretKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                          >
                            {showTargetSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 3 Destination Buckets Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className={labelClass}>1. Target CDN Bucket *</label>
                        <input
                          type="text"
                          value={targetConfig.cdnBucket}
                          onChange={(e) => setTargetConfig(prev => ({ ...prev, cdnBucket: e.target.value }))}
                          placeholder="masdika-cdn"
                          className={inputClass}
                        />
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>For File CDN & encrypted videos</p>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>2. Target Media Bucket *</label>
                        <input
                          type="text"
                          value={targetConfig.mediaBucket}
                          onChange={(e) => setTargetConfig(prev => ({ ...prev, mediaBucket: e.target.value }))}
                          placeholder="masdika-media"
                          className={inputClass}
                        />
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>For avatars, blog, banners, & website uploads</p>
                      </div>

                      <div className="space-y-2">
                        <label className={labelClass}>3. Target Ticket Bucket *</label>
                        <input
                          type="text"
                          value={targetConfig.ticketBucket}
                          onChange={(e) => setTargetConfig(prev => ({ ...prev, ticketBucket: e.target.value }))}
                          placeholder="masdika-ticket"
                          className={inputClass}
                        />
                        <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>For support ticket attachments</p>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3 pt-2">
                    <div 
                      onClick={() => setUpdateActiveConfigAfterTransfer(!updateActiveConfigAfterTransfer)} 
                      className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setUpdateActiveConfigAfterTransfer(!updateActiveConfigAfterTransfer); }}
                        className={cn(
                          "w-5 h-5 border rounded flex items-center justify-center shrink-0 cursor-pointer transition-colors",
                          updateActiveConfigAfterTransfer 
                            ? "bg-cyan-400 border-cyan-400 text-slate-950" 
                            : isDark 
                              ? "bg-[#0a0a0c] border-slate-700 group-hover:border-cyan-500/50" 
                              : "bg-white border-slate-300 group-hover:border-cyan-600"
                        )}
                      >
                        {updateActiveConfigAfterTransfer && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                      <span className={cn("text-xs font-semibold transition-colors", isDark ? "text-zinc-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900")}>
                        Automatically update active settings to destination server & all 3 buckets upon successful migration
                      </span>
                    </div>

                    <div 
                      onClick={() => setDeleteSourceAfterTransfer(!deleteSourceAfterTransfer)} 
                      className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setDeleteSourceAfterTransfer(!deleteSourceAfterTransfer); }}
                        className={cn(
                          "w-5 h-5 border rounded flex items-center justify-center shrink-0 cursor-pointer transition-colors",
                          deleteSourceAfterTransfer 
                            ? "bg-cyan-400 border-cyan-400 text-slate-950" 
                            : isDark 
                              ? "bg-[#0a0a0c] border-slate-700 group-hover:border-cyan-500/50" 
                              : "bg-white border-slate-300 group-hover:border-cyan-600"
                        )}
                      >
                        {deleteSourceAfterTransfer && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                      </button>
                      <span className={cn("text-xs font-semibold transition-colors", isDark ? "text-zinc-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900")}>
                        Delete objects from current source server/buckets after verified transfer (leave unchecked to keep backup)
                      </span>
                    </div>
                  </div>

                  {/* Migration Report */}
                  {bucketMigrationResult && (
                    <div className={cn("p-5 rounded-xl border space-y-4", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Migration Report Across All 3 Buckets</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className={cn("p-3 rounded-lg border", isDark ? "bg-white/5 border-white/5" : "bg-white border-slate-200")}>
                          <span className="text-xs text-zinc-400 block">Total Files</span>
                          <span className="text-sm font-bold text-white">{bucketMigrationResult.total || 0}</span>
                        </div>
                        <div className={cn("p-3 rounded-lg border", isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}>
                          <span className="text-xs text-emerald-400 block">Transferred</span>
                          <span className="text-sm font-bold text-emerald-400">{bucketMigrationResult.migrated || 0}</span>
                        </div>
                        <div className={cn("p-3 rounded-lg border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                          <span className="text-xs text-cyan-400 block">Already in Target</span>
                          <span className="text-sm font-bold text-cyan-400">{bucketMigrationResult.skipped || 0}</span>
                        </div>
                        <div className={cn("p-3 rounded-lg border", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
                          <span className="text-xs text-red-400 block">Errors</span>
                          <span className="text-sm font-bold text-red-400">{bucketMigrationResult.errors || 0}</span>
                        </div>
                      </div>

                      {bucketMigrationResult.categories && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                          <div className={cn("p-3 rounded-lg border", isDark ? "bg-slate-900/60 border-white/[0.08]" : "bg-white border-slate-200")}>
                            <span className="font-semibold text-cyan-400 block mb-1">1. File CDN ({targetConfig.cdnBucket || 'masdika-cdn'})</span>
                            <span className="text-zinc-400">
                              {bucketMigrationResult.categories.cdn?.migrated || 0} transferred • {bucketMigrationResult.categories.cdn?.skipped || 0} skipped
                            </span>
                          </div>
                          <div className={cn("p-3 rounded-lg border", isDark ? "bg-slate-900/60 border-white/[0.08]" : "bg-white border-slate-200")}>
                            <span className="font-semibold text-purple-400 block mb-1">2. Website Media ({targetConfig.mediaBucket || 'masdika-media'})</span>
                            <span className="text-zinc-400">
                              {bucketMigrationResult.categories.media?.migrated || 0} transferred • {bucketMigrationResult.categories.media?.skipped || 0} skipped
                            </span>
                          </div>
                          <div className={cn("p-3 rounded-lg border", isDark ? "bg-slate-900/60 border-white/[0.08]" : "bg-white border-slate-200")}>
                            <span className="font-semibold text-blue-400 block mb-1">3. Ticket Attachments ({targetConfig.ticketBucket || 'masdika-ticket'})</span>
                            <span className="text-zinc-400">
                              {bucketMigrationResult.categories.ticket?.migrated || 0} transferred • {bucketMigrationResult.categories.ticket?.skipped || 0} skipped
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestTargetRustFS}
                      disabled={testingTarget || migratingBucket}
                      className={cn("px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50", isDark ? "bg-slate-800/80 border-slate-700 text-zinc-200 hover:bg-slate-800" : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200")}
                    >
                      {testingTarget ? <div className="w-4 h-4 border-2 border-t-transparent border-cyan-400 rounded-full animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>{testingTarget ? "Testing..." : "Test Target Connection"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleMigrateBucket}
                      disabled={migratingBucket || testingTarget}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-xs rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 cursor-pointer"
                    >
                      {migratingBucket ? (
                        <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                      ) : (
                        <ArrowLeftRight className="w-4 h-4 text-slate-950" />
                      )}
                      <span>{migratingBucket ? "Migrating Media Objects..." : "Start Server / Bucket Migration"}</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'database' && (
              <motion.div key="database" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* Managed Database K3s Cluster Configuration Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className={cn("rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 relative overflow-hidden border", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}
                >
                  <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 sm:pb-6 relative z-10", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                      <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                        <Database className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className={cn("text-lg sm:text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                          Managed Database & Kubernetes Cluster
                        </h2>
                        <p className={cn("text-xs sm:text-sm mt-0.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Configure native Kubernetes API (port 6443 / kubeconfig), public wildcard routing, and web viewer panels (phpMyAdmin, pgAdmin, Mongo Express).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleTestK3s}
                        disabled={testingK3s}
                        className={cn("w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700")}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", testingK3s && "animate-spin text-cyan-400")} />
                        <span>{testingK3s ? "Testing API..." : "Test K8s API Connection"}</span>
                      </button>
                    </div>
                  </div>

                  {k3sTestResult && (
                    <div className={cn("p-4 rounded-xl border flex items-start gap-3", k3sTestResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400")}>
                      {k3sTestResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                      <div className="text-xs md:text-sm space-y-1">
                        <div>
                          <span className="font-bold">{k3sTestResult.success ? "API Verified" : "Connection Failed"}: </span>
                          <span>{k3sTestResult.message}</span>
                          {k3sTestResult.latencyMs !== undefined && (
                            <span className="ml-2 font-mono text-xs opacity-80">({k3sTestResult.latencyMs}ms)</span>
                          )}
                        </div>
                        {k3sTestResult.nodes && k3sTestResult.nodes.length > 0 && (
                          <div className="font-mono text-[11px] opacity-90 pt-1">
                            {k3sTestResult.nodes.map((n, i) => (
                              <div key={i}>• {n}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-6 relative z-20">
                    {/* Section 1: Native Kubernetes REST API (Port 6443) */}
                    <div>
                      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <Server className="w-4 h-4" /> 1. Native Kubernetes API Access (Port 6443 - Gold Standard)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className={labelClass}>Kubernetes API Server URL *</label>
                          <input
                            type="text"
                            name="managed_db_api_server"
                            value={formData.managed_db_api_server}
                            onChange={handleChange}
                            placeholder="e.g. https://192.168.1.50:6443 or https://k8s.example.com:6443"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Kubernetes API server endpoint (port 6443). Overrides the internal server URL in Kubeconfig if set.
                          </p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className={labelClass}>Kubeconfig Content (YAML / /etc/rancher/k3s/k3s.yaml) *</label>
                          <textarea
                            name="managed_db_kubeconfig"
                            value={formData.managed_db_kubeconfig}
                            onChange={handleChange}
                            rows={6}
                            placeholder={formData.managed_db_kubeconfig === "••••••••" ? "•••••••• (Configured and encrypted)" : "apiVersion: v1\nclusters:\n- cluster: ..."}
                            className={cn(inputClass, "font-mono text-xs leading-relaxed resize-y")}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Paste full content of /etc/rancher/k3s/k3s.yaml from your cluster. Stored securely with AES-256 encryption. Leave as •••••••• to keep current.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className={labelClass}>ServiceAccount Token (Optional Alternative)</label>
                          <input
                            type="password"
                            name="managed_db_service_token"
                            value={formData.managed_db_service_token}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className={cn(inputClass, "font-mono")}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Bearer token if using a dedicated ServiceAccount instead of full Kubeconfig.
                          </p>
                        </div>

                        <div className="space-y-2 flex flex-col justify-center pt-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              name="managed_db_skip_tls"
                              checked={formData.managed_db_skip_tls}
                              onChange={(e) => setFormData(prev => ({ ...prev, managed_db_skip_tls: e.target.checked }))}
                              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-black/20 border-white/10"
                            />
                            <span className={cn("text-xs font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>
                              Skip TLS Verification (Recommended for K3s self-signed certs)
                            </span>
                          </label>
                          <p className={cn("text-[11px] pl-6", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Bypasses x509 self-signed certificate warnings when connecting to K3s port 6443.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Public DNS & IP Routing */}
                    <div className="pt-4 border-t border-white/[0.06]">
                      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2", isDark ? "text-purple-400" : "text-purple-700")}>
                        <HardDrive className="w-4 h-4" /> 2. Public Networking & Domain Routing
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={labelClass}>Public Wildcard Domain *</label>
                          <input
                            type="text"
                            name="managed_db_public_domain"
                            value={formData.managed_db_public_domain}
                            onChange={handleChange}
                            placeholder="e.g. db.example.com"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>Host domain used for user connection strings</p>
                        </div>

                        <div className="space-y-2">
                          <label className={labelClass}>Public NodePort IP *</label>
                          <input
                            type="text"
                            name="managed_db_public_ip"
                            value={formData.managed_db_public_ip}
                            onChange={handleChange}
                            placeholder="e.g. 203.0.113.1"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>Public IP address mapped to K3s cluster for direct TCP NodePort access</p>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Web Database Panels */}
                    <div className="pt-4 border-t border-white/[0.06]">
                      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2", isDark ? "text-emerald-400" : "text-emerald-700")}>
                        <Layout className="w-4 h-4" /> 3. Database Web Viewers & GUI Panels
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className={labelClass}>phpMyAdmin URL (MySQL / MariaDB) *</label>
                          <input
                            type="text"
                            name="managed_db_pma_url"
                            value={formData.managed_db_pma_url}
                            onChange={handleChange}
                            placeholder="e.g. https://pma.example.com"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>Web panel URL for MySQL & MariaDB users</p>
                        </div>

                        <div className="space-y-2">
                          <label className={labelClass}>pgAdmin 4 URL (PostgreSQL) *</label>
                          <input
                            type="text"
                            name="managed_db_pgadmin_url"
                            value={formData.managed_db_pgadmin_url}
                            onChange={handleChange}
                            placeholder="e.g. https://pgadmin.db.masdika.id"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>Web panel URL for PostgreSQL instances</p>
                        </div>

                        <div className="space-y-2">
                          <label className={labelClass}>Mongo Express URL (MongoDB) *</label>
                          <input
                            type="text"
                            name="managed_db_mongo_url"
                            value={formData.managed_db_mongo_url}
                            onChange={handleChange}
                            placeholder="e.g. https://mongo.db.masdika.id"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>Web panel URL for MongoDB collections & documents</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className={cn("pt-6 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? "Saving Changes..." : "Save Database Settings"}</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Managed Apps (K8s) Tab */}
            {activeTab === 'apps' && (
              <motion.div
                key="apps"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-6 rounded-2xl border backdrop-blur-xl space-y-6 relative overflow-hidden",
                    isDark ? "bg-[#101014]/60 border-white/[0.08]" : "bg-white border-slate-200 shadow-sm"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-inherit">
                    <div>
                      <h2 className={cn("text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                        <Boxes className="w-5 h-5 text-cyan-400" /> Managed Apps Kubernetes Cluster & Auto SSL
                      </h2>
                      <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                        Configure the dedicated K3s cluster on 192.168.79.17 and Traefik Ingress with Let&apos;s Encrypt automated SSL for all containerized applications.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestAppK3s}
                      disabled={testingAppK3s}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", testingAppK3s && "animate-spin")} />
                      <span>{testingAppK3s ? "Testing Connection..." : "Test Cluster Connection"}</span>
                    </button>
                  </div>

                  {appK3sTestResult && (
                    <div className={cn(
                      "p-4 rounded-xl border text-xs flex items-start gap-3 transition-all",
                      appK3sTestResult.success
                        ? isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-800"
                    )}>
                      {appK3sTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{appK3sTestResult.message}</p>
                          {appK3sTestResult.latencyMs !== undefined && (
                            <span className="font-mono text-[11px] opacity-80">{appK3sTestResult.latencyMs}ms</span>
                          )}
                        </div>
                        {appK3sTestResult.nodes && appK3sTestResult.nodes.length > 0 && (
                          <div className="font-mono text-[11px] opacity-90 pt-1">
                            {appK3sTestResult.nodes.map((n, i) => (
                              <div key={i}>• Node: {n} (Ready)</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-6 relative z-20">
                    <div>
                      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <Server className="w-4 h-4" /> 1. Native Kubernetes API Access (Port 6443)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className={labelClass}>Kubernetes API Server URL *</label>
                          <input
                            type="text"
                            name="managed_app_api_server"
                            value={formData.managed_app_api_server}
                            onChange={handleChange}
                            placeholder="e.g. https://192.168.79.17:6443"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Kubernetes API server endpoint (port 6443).
                          </p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className={labelClass}>Kubeconfig Content (YAML) *</label>
                          <textarea
                            rows={6}
                            name="managed_app_kubeconfig"
                            value={formData.managed_app_kubeconfig}
                            onChange={handleChange}
                            placeholder={formData.managed_app_kubeconfig === "••••••••" ? "•••••••• (Configured and encrypted)" : "apiVersion: v1\nclusters:\n- cluster: ..."}
                            className={cn(inputClass, "font-mono text-xs")}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Kubeconfig for cluster authorization. Encrypted securely with AES-256 at rest.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 md:col-span-2">
                          <input
                            type="checkbox"
                            id="managed_app_skip_tls"
                            name="managed_app_skip_tls"
                            checked={formData.managed_app_skip_tls}
                            onChange={(e) => setFormData(prev => ({ ...prev, managed_app_skip_tls: e.target.checked }))}
                            className="rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                          />
                          <label htmlFor="managed_app_skip_tls" className={cn("text-xs font-medium cursor-pointer", isDark ? "text-zinc-300" : "text-slate-700")}>
                            Skip TLS Certificate Verification (Recommended for internal K3s self-signed CA)
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-inherit">
                      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <Rocket className="w-4 h-4" /> 2. Ingress & NodePort Routing
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className={labelClass}>Public Domain Base *</label>
                          <input
                            type="text"
                            name="managed_app_public_domain"
                            value={formData.managed_app_public_domain}
                            onChange={handleChange}
                            placeholder="e.g. app.masdika.id"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Apps will be accessible at <code className="font-mono text-cyan-400">*.app.masdika.id</code> with auto Let&apos;s Encrypt SSL.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className={labelClass}>Public Ingress IP *</label>
                          <input
                            type="text"
                            name="managed_app_public_ip"
                            value={formData.managed_app_public_ip}
                            onChange={handleChange}
                            placeholder="e.g. 103.247.10.61"
                            className={inputClass}
                          />
                          <p className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Public IP for direct NodePort access (range 30000 - 32767).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className={cn("pt-6 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? "Saving Changes..." : "Save Managed App Settings"}</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteProfileModal}
        onClose={() => setShowDeleteProfileModal(false)}
        onConfirm={handleDeleteProfilePhoto}
        title="Delete Profile Photo?"
        description="Are you sure you want to delete your profile photo from the server? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeletingProfile}
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteCVModal}
        onClose={() => setShowDeleteCVModal(false)}
        onConfirm={handleDeleteCV}
        title="Delete CV?"
        description="Are you sure you want to delete this CV file from the server? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeletingCV}
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteFaviconModal}
        onClose={() => setShowDeleteFaviconModal(false)}
        onConfirm={handleDeleteFavicon}
        title="Delete Favicon?"
        description="Are you sure you want to delete the Favicon.ico file from the server? The browser tab icon will revert to the default Next.js icon."
        confirmText="Delete"
        isLoading={isDeletingFavicon}
        variant="danger"
      />
    </div>
  );
}



