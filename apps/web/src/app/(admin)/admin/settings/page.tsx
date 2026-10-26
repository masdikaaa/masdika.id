"use client";
import { useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { User, Shield, Key, Save, Camera, CheckCircle2, Trash2, X, Share2, Layout, Phone, FileText, Search, Check, CheckCircle, Settings , RefreshCw, Info } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const inputClassDark = 'w-full bg-[#060b14] border border-slate-800 rounded-xl px-5 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-all';
const inputClassLight = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-all';
const labelClassDark = 'block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2';
const labelClassLight = 'block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2';

export default function SettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const inputClass = isDark ? inputClassDark : inputClassLight;
  const labelClass = isDark ? labelClassDark : labelClassLight;
  const [activeTab, setActiveTab] = useUrlTab<'profile' | 'contact' | 'website' | 'seo' | 'security' | 'services'>('profile', { allowed: ['profile', 'contact', 'website', 'seo', 'security', 'services'] as const });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, desc: 'Manage personal info' },
    { id: 'contact', label: 'Contact', icon: Phone, desc: 'Contact & Social links' },
    { id: 'website', label: 'Website', icon: Layout, desc: 'Hero & CV content' },
    { id: 'seo', label: 'SEO', icon: Search, desc: 'Meta tags & Favicon' },
    { id: 'security', label: 'Security', icon: Shield, desc: 'Passwords & 2FA' },
    { id: 'services', label: 'Services', icon: Settings, desc: 'Service Management' },
  ];

  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [setup2FAData, setSetup2FAData] = useState<{ url: string, secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
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
    tax_rate: "0"
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
            hero_description: data.settings?.hero_description || "Specializing in highly available cloud infrastructure, CI/CD automation, and scalable backend services. I build robust systems that power modern digital businesses.",
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
            tax_rate: data.settings?.tax_rate || "0"
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
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, profileImage: '' })
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
      // It's ON, user wants to turn it OFF
      setFormData(prev => ({ ...prev, twoFactorEnabled: false }));
      try {
        await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ twoFactorEnabled: false })
        });
        toast.success("2FA has been disabled.");
      } catch (err) {
        toast.error("An error occurred");
        setFormData(prev => ({ ...prev, twoFactorEnabled: true }));
      }
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
          toast.error("Failed to start 2FA setup");
        }
      } catch (err) {
        toast.error("An error occurred");
      }
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
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("relative overflow-hidden rounded-2xl border p-6 md:p-8", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold mb-4 tracking-wide", isDark ? "text-cyan-400" : "text-cyan-700")}>
            <Settings className="w-3 h-3" /> Account Management
          </div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            System <span className={cn(isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent" : "text-cyan-600")}>Settings</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your profile, website content, SEO, and security.</p>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-60 shrink-0">
          <div className={cn("border rounded-2xl p-2 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn("relative flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left shrink-0 w-full border", isActive ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-800 border-cyan-200") : (isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-transparent"))}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-cyan-500/20 border border-cyan-500/30' : isDark ? "bg-white/5" : "bg-slate-100"}`}>
                    <tab.icon className={cn("w-4 h-4", isActive ? (isDark ? "text-cyan-400" : "text-slate-900") : (isDark ? "text-zinc-500" : "text-slate-400"))} />
                  </div>
                  <div className="hidden md:block">
                    <div className={`text-sm font-bold leading-none ${isActive ? 'text-white' : 'text-zinc-300'}`}>{tab.label}</div>
                    <div className={cn("text-[10px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>{tab.desc}</div>
                  </div>
                  <span className="md:hidden text-sm font-bold">{tab.label}</span>
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
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        
        

        <div className="flex items-center gap-4 border-b border-cyan-500/10 pb-6 relative z-10">
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Profile Information</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Update your account details and profile photo.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-10 relative z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group/avatar">
 <div className={cn("w-36 h-36 rounded-full border-4 border-black overflow-hidden flex items-center justify-center group-hover/-[0_0_0_4px_rgba(6,182,212,0.5)] transition-all", isDark ?"bg-zinc-900":"bg-slate-50")}>
                {profilePreview ? (
                  <img referrerPolicy="no-referrer" src={profilePreview} alt="Profile" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <span className={cn("text-5xl font-black", isDark ? "text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-cyan-600" : "text-cyan-600")}>
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
            
            <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-slate-800" : "border-slate-200")}>
              <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
                {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-5 h-5" />} 
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
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        <div className={cn("flex items-center gap-5 border-b pb-6 relative z-10 mb-8", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Contact Information</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Update the contact details on your Contact page.</p>
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
        <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-slate-800" : "border-slate-200")}>
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
            {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-5 h-5" />} 
            {saving ? "Saving..." : "Save Contact Info"}
          </button>
        </div>
      </motion.div>
                {/* Social Links Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        <div className={cn("flex items-center gap-5 border-b pb-6 relative z-10 mb-8", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Social Media Links</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Update the links that appear in your Navbar and Footer.</p>
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
        <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-slate-800" : "border-slate-200")}>
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
            {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-5 h-5" />} 
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
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        <div className={cn("flex items-center gap-5 border-b pb-6 relative z-10 mb-8", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Website Content</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Update the hero section on your homepage.</p>
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
        <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-slate-800" : "border-slate-200")}>
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
            {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-5 h-5" />} 
            {saving ? "Saving..." : "Save Content"}
          </button>
        </div>
      </motion.div>
                {/* Resume / CV Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        <div className={cn("flex items-center gap-5 border-b pb-6 relative z-10 mb-8", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Resume / CV</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Upload your latest CV (PDF format, max 10MB).</p>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-4">
            <label className={cn("relative inline-flex items-center justify-center px-8 py-3.5 border hover:border-cyan-500/50 rounded-xl font-bold cursor-pointer transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white hover:border-slate-700" : "bg-white border-slate-200 text-slate-900 hover:border-slate-300")}>
              <input type="file" accept="application/pdf" className="hidden" onChange={handleCVUpload} />
              <FileText className={cn("w-5 h-5 mr-2", isDark ? "text-cyan-400" : "text-cyan-700")} />
              Upload New CV
            </label>
            {formData.cv_url && (
              <div className="flex items-center gap-3">
                <a href={formData.cv_url} target="_blank" rel="noopener noreferrer" className={cn("hover:text-cyan-300 font-bold text-sm underline underline-offset-4 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  View Current CV
                </a>
                <button 
                  onClick={() => setShowDeleteCVModal(true)}
                  className={cn("p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors", isDark ? "text-red-500" : "text-red-700")}
                  title="Delete CV from storage"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
            {formData.cv_url ? `Current CV path: ${formData.cv_url}` : "No CV uploaded yet."}
          </p>
        </div>
        <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-slate-800" : "border-slate-200")}>
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
            {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-5 h-5" />} 
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
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        <div className={cn("flex items-center gap-5 border-b pb-6 relative z-10 mb-8", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>SEO & Favicon</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your website's meta description and favicon.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 relative z-10">
          <div className="space-y-4">
            <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Page Meta Descriptions</h3>
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
          
          <div className={cn("space-y-4 pt-6 mt-6 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
            <label className={labelClass}>Favicon (.ico only)</label>
            <div className="flex items-center gap-6">
              <div className={cn("w-16 h-16 rounded-xl border flex items-center justify-center overflow-hidden relative", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                <img referrerPolicy="no-referrer" src={`/favicon.ico?v=${faviconKey}`} alt="Favicon" className="w-8 h-8" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgY3Vyc29yPSJwb2ludGVyIj48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMSIgLz48L3N2Zz4=' }} />
              </div>
              <div className="flex items-center gap-4">
                <label className={cn("flex flex-col items-center justify-center px-6 py-2 border hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all", isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200")}>
                  <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>Upload .ico</span>
                  <span className={cn("text-[10px] mt-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>Recommended: 32x32px</span>
                  <input type="file" accept=".ico" className="hidden" onChange={handleFaviconUpload} />
                </label>
                <button 
                  onClick={() => setShowDeleteFaviconModal(true)}
                  disabled={isDeletingFavicon}
                  className={cn("p-2.5 rounded-xl transition-all border shrink-0", isDark ? "bg-[#060b14] hover:bg-slate-800 text-white border-slate-800" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}
                  title="Delete Favicon"
                >
                  <Trash2 className="w-4 h-4" />
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
        <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-slate-800" : "border-slate-200")}>
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
            {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-5 h-5" />} 
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
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >

        <div className="flex items-center gap-4 border-b border-cyan-500/10 pb-6 relative z-10">
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")} >
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Security & 2FA</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your password and Two-Factor Authentication.</p>
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          <div className="flex flex-col gap-4">
            <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border transition-colors group", isDark ? "bg-[#060b14] border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300")}>
              <div>
                <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Key className={cn("w-5 h-5 group-hover:rotate-12 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} /> 
                  Two-Factor Authentication
                </h3>
                <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>Add an extra layer of security to your account. This setting saves automatically when toggled.</p>
              </div>
              
              <button 
                onClick={handleToggle2FA}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${formData.twoFactorEnabled ? 'bg-cyan-400' : (isDark ? 'bg-slate-800' : 'bg-slate-300')}`}
              >
                <span className="sr-only">Use setting</span>
 <span aria-hidden="true"className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-950 ring-0 transition duration-200 ease-in-out ${formData.twoFactorEnabled ?'translate-x-3 bg-slate-950':'-translate-x-3 bg-white'}`} />
              </button>
            </div>

            <AnimatePresence>
              {setup2FAData && !formData.twoFactorEnabled && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className={cn("p-8 rounded-2xl border flex flex-col items-center gap-6 text-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
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
                        className={cn("w-full px-5 py-4 border rounded-xl text-center tracking-[0.5em] text-2xl font-bold focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")} 
                      />
                      
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setSetup2FAData(null)}
                          className={cn("flex-1 py-3.5 font-bold rounded-xl transition-colors border", isDark ? "text-slate-300 border-slate-800 bg-[#060b14] hover:bg-slate-800" : "text-slate-700 border-slate-200 bg-white hover:bg-slate-50")}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleVerify2FA}
                          disabled={verifyCode.length !== 6 || verifying2FA}
                          className="flex-1 py-2.5 px-4 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
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

          <div className={cn("space-y-6 w-full p-6 rounded-2xl border", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}>
            <h3 className={cn("font-bold text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>Change Password</h3>
            <div className="space-y-3">
              <label className={labelClass}>Current Password</label>
              <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="••••••••" className={cn("w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0b1322] border-slate-800 text-white placeholder:text-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")} />
            </div>
            <div className="space-y-3">
              <label className={labelClass}>New Password</label>
              <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="••••••••" className={cn("w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0b1322] border-slate-800 text-white placeholder:text-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")} />
            </div>
            <div className="space-y-3">
              <label className={labelClass}>Confirm New Password</label>
              <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="••••••••" className={cn("w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0b1322] border-slate-800 text-white placeholder:text-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")} />
            </div>
            <button 
              onClick={handleUpdatePassword} 
              disabled={passwordSaving}
              className={cn("flex items-center justify-center w-full px-6 py-3.5 font-bold rounded-xl transition-colors border mt-2 disabled:opacity-50", isDark ? "text-white border-slate-800 bg-[#0b1322] hover:bg-slate-800" : "text-slate-900 border-slate-200 bg-white hover:bg-slate-100")}
            >
              {passwordSaving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : "Update Password"}
            </button>
          </div>
        </div>
      </motion.div>


      {/* System Maintenance Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        <div className={cn("flex items-center gap-5 border-b pb-6 relative z-10 mb-8", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>System Maintenance</h2>
            <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>Put the customer panel in maintenance mode. Admins can still access the dashboard.</p>
          </div>
        </div>

        <div className="space-y-6 relative z-20">
          <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border transition-colors group", isDark ? "bg-white/5 border-cyan-500/10 hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-500/30")}>
            <div className="pr-4">
              <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Shield className={cn("w-5 h-5 group-hover:rotate-12 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} /> 
                Enable Maintenance Mode
              </h3>
              <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>When enabled, customers will see a maintenance screen instead of their dashboard. You (Admin) will still have full access.</p>
            </div>
            
            <button 
              onClick={() => setFormData({ ...formData, maintenance_mode: !formData.maintenance_mode })}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black ${formData.maintenance_mode ? 'bg-cyan-500' : 'bg-zinc-700'}`}
            >
              <span className="sr-only">Toggle Maintenance Mode</span>
 <span aria-hidden="true"className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.maintenance_mode ?'translate-x-3':'-translate-x-3'}`} />
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
        <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-slate-800" : "border-slate-200")}>
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
            {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-5 h-5" />} 
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
        className={cn("rounded-2xl p-6 md:p-10 space-y-8 relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        <div className={cn("flex items-center gap-5 border-b pb-6 relative z-10 mb-8", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-slate-900")}>
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className={cn("text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Service Management</h2>
            <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>Enable or disable specific services. Disabled services will show as "Coming Soon".</p>
          </div>
        </div>

        <div className="space-y-6 relative z-20">
          <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border transition-colors group", isDark ? "bg-white/5 border-cyan-500/10 hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-500/30")}>
            <div className="pr-4">
              <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Settings className={cn("w-5 h-5 group-hover:rotate-45 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} /> 
                Enable Cloud VPS
              </h3>
              <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>When disabled, customers cannot deploy new Cloud VPS instances. The frontend will display "Coming Soon".</p>
            </div>
            
            <button 
              onClick={() => setFormData({ ...formData, vps_enabled: !formData.vps_enabled })}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black ${formData.vps_enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
            >
              <span className="sr-only">Toggle Cloud VPS</span>
 <span aria-hidden="true"className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.vps_enabled ?'translate-x-3':'-translate-x-3'}`} />
            </button>
          </div>

          <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border transition-colors group", isDark ? "bg-white/5 border-cyan-500/10 hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-500/30")}>
            <div className="pr-4">
              <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Settings className={cn("w-5 h-5 group-hover:rotate-45 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} /> 
                Enable Kubernetes (K3s)
              </h3>
              <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>When disabled, customers cannot deploy new Kubernetes clusters. The frontend will display "Coming Soon".</p>
            </div>
            
            <button 
              onClick={() => setFormData({ ...formData, k3s_enabled: !formData.k3s_enabled })}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black ${formData.k3s_enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
            >
              <span className="sr-only">Toggle Kubernetes</span>
 <span aria-hidden="true"className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.k3s_enabled ?'translate-x-3':'-translate-x-3'}`} />
            </button>
          </div>



          <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border transition-colors group", isDark ? "bg-white/5 border-cyan-500/10 hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-500/30")}>
            <div className="pr-4">
              <h3 className={cn("font-bold flex items-center gap-2 text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <Settings className={cn("w-5 h-5 group-hover:rotate-45 transition-transform", isDark ? "text-cyan-400" : "text-cyan-700")} /> 
                Enable CDN
              </h3>
              <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>When disabled, customers cannot order new CDN plans. The frontend will display "Coming Soon".</p>
            </div>
            
            <button 
              onClick={() => setFormData({ ...formData, cdn_enabled: !formData.cdn_enabled })}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-black ${formData.cdn_enabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
            >
              <span className="sr-only">Toggle CDN</span>
 <span aria-hidden="true"className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out ${formData.cdn_enabled ?'translate-x-3':'-translate-x-3'}`} />
            </button>
          </div>

          <div className={cn("space-y-3 mt-6 pt-6 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
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
        <div className={cn("pt-6 mt-6 border-t flex", isDark ? "border-slate-800" : "border-slate-200")}>
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950">
            {saving ? <div className={cn("w-5 h-5 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} /> : <Save className="w-5 h-5" />} 
            {saving ? "Saving..." : "Save Service Settings"}
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



