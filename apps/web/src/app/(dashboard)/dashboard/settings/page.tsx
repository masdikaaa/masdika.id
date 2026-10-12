'use client';

import { useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useState, useEffect, useRef } from 'react';
import { User, Shield, Upload, Save, Lock, Loader2, Smartphone, ShieldCheck, Settings, Camera, Mail, KeyRound, X, Eye, EyeOff, CheckCircle2, AlertTriangle, Phone, MapPin, Briefcase, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';

const inputClassDark = 'w-full bg-[#060b14] border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-sm';
  const inputClassLight = 'w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-sm';
const labelClassDark = 'block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2';
  const labelClassLight = 'block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2';


const OtpInput = ({ value, onChange, isDanger = false }: { value: string; onChange: (val: string) => void; isDanger?: boolean }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const activeColor = isDanger 
    ? (isDark ? 'border-rose-500 text-white bg-rose-500/10' : 'border-rose-500 text-slate-900 bg-rose-50') 
    : (isDark ? 'border-cyan-500 text-white bg-cyan-500/10' : 'border-cyan-600 text-slate-900 bg-cyan-50');
  const focusColor = isDanger 
    ? 'border-2 border-rose-500 text-transparent' 
    : (isDark ? 'border-2 border-cyan-500 text-transparent' : 'border-2 border-cyan-600 text-transparent');
  return (
    <div className="relative w-full">
      <div className="flex gap-2 justify-between">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className={`flex-1 aspect-square rounded-xl flex items-center justify-center text-2xl font-black transition-all ${
              value.length > i 
                ? activeColor 
                : value.length === i
                ? focusColor
                : (isDark ? 'border border-slate-800 text-slate-600 bg-[#060b14]' : 'border border-slate-200 text-slate-300 bg-slate-50')
            }`}
          >
            {value[i] || '0'}
          </div>
        ))}
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
        maxLength={6}
      />
    </div>
  );
};

export default function SettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const inputClass = isDark ? inputClassDark : inputClassLight;
  const labelClass = isDark ? labelClassDark : labelClassLight;
  const [activeTab, setActiveTab] = useUrlTab<'profile' | 'security'>('profile', { allowed: ['profile', 'security'] as const });
  
  // Profile State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Billing Info State
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // Security State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Email Edit State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailOtpStep, setEmailOtpStep] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/dashboard/settings/profile');
      const data = await res.json();
      if (data.user) {
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        setImagePreview(data.user.image || null);
        setTwoFactorEnabled(data.user.twoFactorEnabled || false);
        setCompanyName(data.user.companyName || '');
        setPhone(data.user.phone || '');
        setAddress1(data.user.address1 || '');
        setAddress2(data.user.address2 || '');
        setCity(data.user.city || '');
        setStateName(data.user.state || '');
        setPostalCode(data.user.postalCode || '');
        setCountry(data.user.country || '');
      }
    } catch (error) {
      console.error('Failed to load profile', error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Allow digits only for formatting
    let digits = val.replace(/\D/g, "");
    
    if (digits.length === 0) {
      setPhone("");
      return;
    }

    let formatted = "+";
    
    if (digits.startsWith("62")) {
      formatted += "62";
      if (digits.length > 2) formatted += " " + digits.substring(2, 5);
      if (digits.length > 5) formatted += " " + digits.substring(5, 9);
      if (digits.length > 9) formatted += " " + digits.substring(9, 14);
    } else if (digits.startsWith("1")) {
      formatted += "1";
      if (digits.length > 1) formatted += " " + digits.substring(1, 4);
      if (digits.length > 4) formatted += " " + digits.substring(4, 7);
      if (digits.length > 7) formatted += " " + digits.substring(7, 11);
    } else {
      // Generic format
      formatted += digits.substring(0, 2);
      if (digits.length > 2) formatted += " " + digits.substring(2, 5);
      if (digits.length > 5) formatted += " " + digits.substring(5, 9);
      if (digits.length > 9) formatted += " " + digits.substring(9, 15);
    }
    
    // Add trailing space if user typed it
    if (val.endsWith(" ") && formatted.length < 15 && !formatted.endsWith(" ")) {
       formatted += " ";
    }

    setPhone(formatted);
  };

  const saveProfile = async () => {
    if (name.trim().length < 3) return toast.error("Full Name must be at least 3 characters");
    if (phone.replace(/\D/g, "").length < 8) return toast.error("Please enter a valid phone number");
    if (address1.trim().length < 5) return toast.error("Please enter a complete address");
    if (city.trim().length < 2) return toast.error("Please enter a valid city");
    if (stateName.trim().length < 2) return toast.error("Please enter a valid state/province");
    if (postalCode.trim().length < 3) return toast.error("Please enter a valid postal code");
    if (!country) return toast.error("Please select a country");

    try {
      setIsSavingProfile(true);
      const formData = new FormData();
      formData.append('name', name);
      if (selectedFile) formData.append('image', selectedFile);
      // Billing fields
      formData.append('companyName', companyName);
      formData.append('phone', phone);
      formData.append('address1', address1);
      formData.append('address2', address2);
      formData.append('city', city);
      formData.append('state', stateName);
      formData.append('postalCode', postalCode);
      formData.append('country', country);
      const res = await fetch('/api/dashboard/settings/profile', { method: 'PUT', body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated successfully!');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      setIsDeletingImage(true);
      const formData = new FormData();
      formData.append('removeImage', 'true');
      const res = await fetch('/api/dashboard/settings/profile', { method: 'PUT', body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile picture removed');
        setImagePreview(null);
        setSelectedFile(null);
        setShowDeleteImageModal(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(data.error || 'Failed to remove image');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handlePasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      setIsPasswordLoading(true);
      const res = await fetch('/api/dashboard/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', oldPassword }),
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setShowOtpModal(true); }
      else { toast.error(data.error || 'Failed to request password change'); }
    } catch (error) { toast.error('An error occurred'); }
    finally { setIsPasswordLoading(false); }
  };

  const handleVerifyOtp = async () => {
    try {
      setIsVerifyingOtp(true);
      const res = await fetch('/api/dashboard/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_and_change', otpCode, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setShowOtpModal(false);
        setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setOtpCode('');
      } else { toast.error(data.error || 'Invalid OTP code'); }
    } catch (error) { toast.error('An error occurred'); }
    finally { setIsVerifyingOtp(false); }
  };

  const handleEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailInput || newEmailInput === email) { toast.error('Please enter a new valid email address'); return; }
    try {
      setIsEmailLoading(true);
      const res = await fetch('/api/dashboard/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_otp', newEmail: newEmailInput }),
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setEmailOtpStep(true); }
      else { toast.error(data.error || 'Failed to request email change'); }
    } catch (error) { toast.error('An error occurred'); }
    finally { setIsEmailLoading(false); }
  };

  const handleVerifyEmailOtp = async () => {
    try {
      setIsEmailLoading(true);
      const res = await fetch('/api/dashboard/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_and_change', otpCode: emailOtpCode, newEmail: newEmailInput }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setShowEmailModal(false); setEmailOtpStep(false); setNewEmailInput(''); setEmailOtpCode('');
        fetchProfile();
      } else { toast.error(data.error || 'Invalid OTP code'); }
    } catch (error) { toast.error('An error occurred'); }
    finally { setIsEmailLoading(false); }
  };

  const submitDisable2FA = async () => {
    if (!disable2FACode || disable2FACode.length < 6) { toast.error('Please enter a valid 6-digit code'); return; }
    try {
      setIs2FALoading(true);
      const res = await fetch('/api/dashboard/settings/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', code: disable2FACode }),
      });
      const data = await res.json();
      if (data.success) { toast.success('2FA disabled successfully'); setTwoFactorEnabled(false); setShowDisable2FAModal(false); }
      else { toast.error(data.error || 'Failed to disable 2FA'); }
    } catch (error) { toast.error('An error occurred'); }
    finally { setIs2FALoading(false); }
  };

  const handle2FAToggle = async () => {
    if (twoFactorEnabled) {
      setDisable2FACode(''); setShowDisable2FAModal(true);
    } else {
      try {
        setIs2FALoading(true);
        const res = await fetch('/api/dashboard/settings/2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate' }),
        });
        const data = await res.json();
        if (data.qrCodeUrl) { setQrCodeUrl(data.qrCodeUrl); setSecret(data.secret); setShowTwoFactorModal(true); }
      } catch (error) { toast.error('Failed to setup 2FA'); }
      finally { setIs2FALoading(false); }
    }
  };

  const handleVerify2FA = async () => {
    try {
      setIs2FALoading(true);
      const res = await fetch('/api/dashboard/settings/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_enable', code: twoFactorCode }),
      });
      const data = await res.json();
      if (data.success) { toast.success('2FA enabled successfully!'); setTwoFactorEnabled(true); setShowTwoFactorModal(false); setTwoFactorCode(''); }
      else { toast.error(data.error || 'Invalid code'); }
    } catch (error) { toast.error('An error occurred'); }
    finally { setIs2FALoading(false); }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, desc: 'Manage personal info' },
    { id: 'security', label: 'Security', icon: Shield, desc: 'Passwords & 2FA' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div className="space-y-6 md:space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl border p-6 md:p-8 group shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        
        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
            <Settings className="w-3 h-3" /> Account Management
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Account <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Settings</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-slate-400" : "text-slate-500")}>Manage your profile information, email address, password, and account security.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-60 shrink-0">
          <div className={cn("rounded-3xl p-2 shadow-md flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'profile' | 'security')}
                  className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left shrink-0 w-full border ${
                    isActive
                      ? (isDark ? 'bg-slate-800/90 text-white border-slate-700 shadow-sm' : 'bg-slate-100 text-slate-900 border-slate-300 shadow-sm')
                      : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50')
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isActive ? (isDark ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-cyan-100 border-cyan-200 text-cyan-700') : (isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')}`}>
                    <tab.icon className="w-4 h-4" />
                  </div>
                  <div className="hidden md:block">
                    <div className={`text-sm font-bold leading-none ${isActive ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}>{tab.label}</div>
                    <div className={cn("text-[10px] mt-1.5", isDark ? "text-slate-400" : "text-slate-400")}>{tab.desc}</div>
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
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Avatar Card */}
                <div className={cn("rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                  
                  <h3 className={cn("text-lg font-bold mb-6 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                    <Camera className="w-5 h-5 text-cyan-400" /> Profile Picture
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                    <div className="relative group shrink-0">
                      <div className={cn("w-32 h-32 rounded-3xl overflow-hidden border-2 relative", isDark ? "border-slate-800 bg-[#060b14] shadow-sm" : "border-slate-200 bg-slate-100 shadow-sm")}>
                        {imagePreview ? (
                          <img referrerPolicy="no-referrer" src={imagePreview} alt="Profile" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-600 to-blue-700">
                            <span className="text-5xl font-bold text-white">
                              {name ? name.charAt(0).toUpperCase() : <User className="w-16 h-16 text-white/80" />}
                            </span>
                          </div>
                        )}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                        >
                          <Upload className="w-7 h-7 mb-1 text-white" />
                          <span className="text-xs font-bold text-white">Change</span>
                        </div>
                      </div>
                      <div 
                        className={cn("absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm cursor-pointer transition-colors border-2", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-[#0b1322]" : "bg-cyan-600 hover:bg-cyan-700 text-white border-white")} 
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-4 h-4" />
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left">
                      <h4 className={cn("font-bold text-lg mb-1", isDark ? "text-white" : "text-slate-900")}>{name || 'Your Name'}</h4>
                      <p className={cn("text-sm mb-3", isDark ? "text-slate-400" : "text-slate-500")}>{email}</p>
                      <p className={cn("text-xs mb-4 rounded-xl px-3 py-1.5 border inline-block", isDark ? "text-slate-400 bg-[#060b14] border-slate-800" : "text-slate-500 bg-slate-50 border-slate-200")}>PNG or JPG · Max size 2MB</p>
                      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                        <button onClick={() => fileInputRef.current?.click()} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border", isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200")}>
                          <Upload className="w-4 h-4" /> Upload Photo
                        </button>
                        {imagePreview && (
                          <button onClick={() => setShowDeleteImageModal(true)} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all border", isDark ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600")}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Info Card */}
                <div className={cn("rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                  <h3 className={cn("text-lg font-bold mb-6 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                    <User className="w-5 h-5 text-cyan-400" /> Personal Information
                  </h3>
                  <div className="space-y-5 relative z-10">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className={inputClass}
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelClass} style={{marginBottom: 0}}>Email Address</label>
                        <button
                          type="button"
                          onClick={() => setShowEmailModal(true)}
                          className={cn("text-xs font-semibold transition-colors px-3 py-1 rounded-lg border", isDark ? "text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700" : "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200")}
                        >
                          Change Email
                        </button>
                      </div>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className={cn("w-full rounded-2xl px-5 py-3.5 text-sm cursor-not-allowed border", isDark ? "bg-[#060b14]/70 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-400")}
                      />
                      <p className={cn("text-[11px] mt-1.5 ml-1", isDark ? "text-slate-500" : "text-slate-400")}>Email can only be changed via OTP verification.</p>
                    </div>
                  </div>
                </div>

                {/* Billing Info Card */}
                <div className={cn("rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                  <h3 className={cn("text-lg font-bold mb-6 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                    <Building2 className="w-5 h-5 text-cyan-400" /> Billing Information
                  </h3>
                  <div className="space-y-5 relative z-10">
                    {/* Company Name */}
                    <div>
                      <label className={labelClass}>Company Name <span className={cn("normal-case font-normal", isDark ? "text-slate-500" : "text-slate-400")}>(optional)</span></label>
                      <div className="relative">
                        <Briefcase className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-slate-500" : "text-slate-400")} />
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company or organization" className={inputClass + ' pl-11'} />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <div className="relative">
                        <Phone className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-slate-500" : "text-slate-400")} />
                        <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="+1 234 567 8900" className={inputClass + ' pl-11'} minLength={8} />
                      </div>
                    </div>

                    {/* Address 1 */}
                    <div>
                      <label className={labelClass}>Address</label>
                      <div className="relative mb-2">
                        <MapPin className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-slate-500" : "text-slate-400")} />
                        <input type="text" value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Street address" className={inputClass + ' pl-11'} />
                      </div>
                      <input type="text" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apt, suite, floor (optional)" className={inputClass} />
                    </div>

                    {/* City + State */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>City</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jakarta" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>State / Province</label>
                        <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="DKI Jakarta" className={inputClass} />
                      </div>
                    </div>

                    {/* Postal Code + Country */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Postal Code</label>
                        <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="10110" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Country</label>
                        <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass + ' cursor-pointer'}>
                          <option value="">Select country</option>
                          <option value="ID">Indonesia</option>
                          <option value="SG">Singapore</option>
                          <option value="MY">Malaysia</option>
                          <option value="TH">Thailand</option>
                          <option value="PH">Philippines</option>
                          <option value="VN">Vietnam</option>
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="AU">Australia</option>
                          <option value="JP">Japan</option>
                          <option value="KR">South Korea</option>
                          <option value="CN">China</option>
                          <option value="IN">India</option>
                          <option value="DE">Germany</option>
                          <option value="NL">Netherlands</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={cn("pt-6 mt-6 border-t flex justify-end relative z-10", isDark ? "border-slate-800" : "border-slate-200")}>
                    <button
                      onClick={saveProfile}
                      disabled={isSavingProfile}
                      className={cn("px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-white disabled:opacity-50 shadow-sm", isDark ? "bg-cyan-500 hover:bg-cyan-400" : "bg-cyan-600 hover:bg-cyan-700")}
                    >
                      {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            )}


            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Change Password Card */}
                <div className={cn("rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                  
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border", isDark ? "bg-slate-800 border-slate-700 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Change Password</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>Use a strong, unique password to keep your account safe.</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordRequest} className="space-y-4 relative z-10">
                    <div>
                      <label className={labelClass}>Current Password</label>
                      <div className="relative">
                        <input
                          type={showOldPw ? 'text' : 'password'}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="••••••••"
                          className={inputClass + ' pr-12'}
                          required
                        />
                        <button type="button" onClick={() => setShowOldPw(v => !v)} className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                          {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            className={inputClass + ' pr-12'}
                            required
                          />
                          <button type="button" onClick={() => setShowNewPw(v => !v)} className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPw ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className={`${inputClass} pr-12 ${confirmPassword && newPassword && confirmPassword !== newPassword ? 'border-rose-500/50 focus:ring-rose-500/20' : confirmPassword && confirmPassword === newPassword ? 'border-emerald-500/50 focus:ring-emerald-500/20' : ''}`}
                            required
                          />
                          <button type="button" onClick={() => setShowConfirmPw(v => !v)} className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                            {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmPassword && newPassword && confirmPassword !== newPassword && (
                          <p className="text-[11px] text-rose-400 mt-1.5 ml-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Passwords don't match</p>
                        )}
                        {confirmPassword && confirmPassword === newPassword && (
                          <p className="text-[11px] text-emerald-400 mt-1.5 ml-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>
                        )}
                      </div>
                    </div>

                    <div className={cn("pt-4 border-t flex justify-end", isDark ? "border-slate-800" : "border-slate-200")}>
                      <button
                        type="submit"
                        disabled={isPasswordLoading}
                        className={cn("px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-white disabled:opacity-50 shadow-sm", isDark ? "bg-cyan-500 hover:bg-cyan-400" : "bg-cyan-600 hover:bg-cyan-700")}
                      >
                        {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2FA Card */}
                <div className={cn("rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                  
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border", isDark ? "bg-slate-800 border-slate-700 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Two-Factor Authentication</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>Add an extra layer of security with an authenticator app.</p>
                    </div>
                  </div>

                  <div className={`relative z-10 rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 ${twoFactorEnabled ? (isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200') : (isDark ? 'bg-[#060b14] border-slate-800' : 'bg-slate-50 border-slate-200')}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${twoFactorEnabled ? (isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200') : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')}`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>Authenticator App</h4>
                        <div className={`mt-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-lg w-fit border ${twoFactorEnabled ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700') : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')}`}>
                          {twoFactorEnabled ? '✓ Active & Configured' : 'Not configured'}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handle2FAToggle}
                      disabled={is2FALoading}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all disabled:opacity-50 shrink-0 ${twoFactorEnabled ? 'bg-cyan-500' : (isDark ? 'bg-slate-700' : 'bg-slate-300')}`}
                    >
                      {is2FALoading ? (
                        <Loader2 className={cn("w-4 h-4 animate-spin mx-auto", isDark ? "text-white" : "text-slate-900")} />
                      ) : (
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${twoFactorEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                      )}
                    </button>
                  </div>

                  <p className={cn("text-xs leading-relaxed relative z-10", isDark ? "text-slate-400" : "text-slate-500")}>
                    When 2FA is enabled, you will be prompted for a secure token during login. Retrieve this from your phone's Google Authenticator or Authy application.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ─── Modals ───────────────────────────────────────────────────── */}

      {/* OTP Verify Password Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("rounded-3xl border p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
              <button onClick={() => setShowOtpModal(false)} className={cn("absolute top-5 right-5 transition-colors p-2 rounded-xl", isDark ? "text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200")}><X className="w-4 h-4" /></button>
              <div className="text-center mb-6 relative z-10">
                <div className={cn("w-16 h-16 border rounded-2xl flex items-center justify-center mx-auto mb-4", isDark ? "bg-slate-800 border-slate-700 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                  <KeyRound className="w-8 h-8" />
                </div>
                <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Verify Password Change</h3>
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>We've sent a 6-digit code to your email. Enter it below to confirm the change.</p>
              </div>
              <div className="space-y-4 relative z-10">
                <OtpInput value={otpCode} onChange={setOtpCode} />
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowOtpModal(false)} className={cn("flex-1 px-4 py-3.5 rounded-2xl border font-bold transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>Cancel</button>
                  <button onClick={handleVerifyOtp} disabled={isVerifyingOtp || otpCode.length < 6} className={cn("flex-1 flex justify-center items-center gap-2 px-4 py-3.5 rounded-2xl text-white font-bold transition-all disabled:opacity-50", isDark ? "bg-cyan-500 hover:bg-cyan-400 shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 shadow-sm")}>
                    {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Change Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("rounded-3xl border p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
              <button onClick={() => { setShowEmailModal(false); setEmailOtpStep(false); }} className={cn("absolute top-5 right-5 transition-colors p-2 rounded-xl", isDark ? "text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200")}><X className="w-4 h-4" /></button>

              <div className="text-center mb-6 relative z-10">
                <div className={cn("w-16 h-16 border rounded-2xl flex items-center justify-center mx-auto mb-4", isDark ? "bg-slate-800 border-slate-700 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Change Email Address</h3>
              </div>

              {!emailOtpStep ? (
                <form onSubmit={handleEmailRequest} className="space-y-4 relative z-10">
                  <p className={cn("text-sm text-center -mt-2 mb-4", isDark ? "text-slate-400" : "text-slate-500")}>Enter your new email. We'll send a verification code to your <strong className={isDark ? "text-white" : "text-slate-900"}>current</strong> email.</p>
                  <div>
                    <label className={labelClass}>New Email Address</label>
                    <input type="email" required value={newEmailInput} onChange={(e) => setNewEmailInput(e.target.value)} className={inputClass} placeholder="new@example.com" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowEmailModal(false)} className={cn("flex-1 px-4 py-3.5 rounded-2xl border font-bold transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>Cancel</button>
                    <button type="submit" disabled={isEmailLoading || !newEmailInput} className={cn("flex-1 flex justify-center items-center gap-2 px-4 py-3.5 rounded-2xl text-white font-bold disabled:opacity-50 transition-all", isDark ? "bg-cyan-500 hover:bg-cyan-400 shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 shadow-sm")}>
                      {isEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 relative z-10">
                  <p className={cn("text-sm text-center -mt-2 mb-4", isDark ? "text-slate-400" : "text-slate-500")}>We've sent a code to <strong className={isDark ? "text-white" : "text-slate-900"}>{email}</strong>. Enter it to confirm changing to <strong className="text-cyan-400">{newEmailInput}</strong>.</p>
                  <OtpInput value={emailOtpCode} onChange={setEmailOtpCode} />
                  <div className="flex gap-3">
                    <button onClick={() => { setEmailOtpStep(false); setEmailOtpCode(''); }} className={cn("flex-1 px-4 py-3.5 rounded-2xl border font-bold transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>Back</button>
                    <button onClick={handleVerifyEmailOtp} disabled={isEmailLoading || emailOtpCode.length < 6} className={cn("flex-1 flex justify-center items-center gap-2 px-4 py-3.5 rounded-2xl text-white font-bold disabled:opacity-50 transition-all", isDark ? "bg-cyan-500 hover:bg-cyan-400 shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 shadow-sm")}>
                      {isEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Save'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {showTwoFactorModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("rounded-3xl border p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
              <button onClick={() => setShowTwoFactorModal(false)} className={cn("absolute top-5 right-5 transition-colors p-2 rounded-xl", isDark ? "text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200")}><X className="w-4 h-4" /></button>

              <div className="text-center mb-6 relative z-10">
                <div className={cn("w-16 h-16 border rounded-2xl flex items-center justify-center mx-auto mb-4", isDark ? "bg-slate-800 border-slate-700 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Setup 2FA</h3>
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>Scan this QR code with Google Authenticator or Authy.</p>
              </div>

              <div className="flex justify-center mb-6 relative z-10">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  {qrCodeUrl && <img referrerPolicy="no-referrer" src={qrCodeUrl} alt="QR Code" className="w-48 h-48" loading="lazy" decoding="async" />}
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <label className={labelClass}>Verification Code</label>
                  <OtpInput value={twoFactorCode} onChange={setTwoFactorCode} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowTwoFactorModal(false)} className={cn("flex-1 px-4 py-3.5 rounded-2xl border font-bold transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>Cancel</button>
                  <button onClick={handleVerify2FA} disabled={is2FALoading || twoFactorCode.length < 6} className={cn("flex-1 flex justify-center items-center gap-2 px-4 py-3.5 rounded-2xl text-white font-bold disabled:opacity-50 transition-all", isDark ? "bg-cyan-500 hover:bg-cyan-400 shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 shadow-sm")}>
                    {is2FALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable 2FA'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove Profile Picture Confirm */}
      <ConfirmModal
        isOpen={showDeleteImageModal}
        onClose={() => setShowDeleteImageModal(false)}
        onConfirm={handleDeleteImage}
        title="Remove Profile Picture?"
        description="Your profile picture will be permanently removed and replaced with the default avatar."
        confirmText="Remove"
        isLoading={isDeletingImage}
        variant="danger"
      />

      {/* Disable 2FA Modal */}
      <ConfirmModal
        isOpen={showDisable2FAModal}
        onClose={() => setShowDisable2FAModal(false)}
        onConfirm={submitDisable2FA}
        title="Disable Two-Factor Authentication"
        description="Are you sure? Disabling 2FA will make your account less secure. Enter your current 2FA code to confirm."
        confirmText="Disable 2FA"
        variant="danger"
        isLoading={is2FALoading}
      >
        <OtpInput value={disable2FACode} onChange={setDisable2FACode} isDanger={true} />
      </ConfirmModal>
    </motion.div>
  );
}