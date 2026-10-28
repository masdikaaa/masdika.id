'use client';

import { useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useState, useEffect, useRef } from 'react';
import { User, Shield, Upload, Save, Lock, Loader2, Smartphone, ShieldCheck, Settings, Camera, Mail, KeyRound, X, Eye, EyeOff, CheckCircle2, AlertTriangle, Phone, MapPin, Briefcase, Building2, History, RefreshCw, Laptop, Tablet, Globe, LogOut, ChevronLeft, ChevronRight, Clock, Calendar, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Select } from '@/components/ui/Select';
import { BrowserIcon } from '@/components/ui/BrowserIcon';
import { motion, AnimatePresence } from 'framer-motion';

const COUNTRY_OPTIONS = [
  { value: "ID", label: "🇮🇩 Indonesia" },
  { value: "SG", label: "🇸🇬 Singapore" },
  { value: "MY", label: "🇲🇾 Malaysia" },
  { value: "TH", label: "🇹🇭 Thailand" },
  { value: "PH", label: "🇵🇭 Philippines" },
  { value: "VN", label: "🇻🇳 Vietnam" },
  { value: "US", label: "🇺🇸 United States" },
  { value: "GB", label: "🇬🇧 United Kingdom" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "JP", label: "🇯🇵 Japan" },
  { value: "KR", label: "🇰🇷 South Korea" },
  { value: "CN", label: "🇨🇳 China" },
  { value: "IN", label: "🇮🇳 India" },
  { value: "DE", label: "🇩🇪 Germany" },
  { value: "NL", label: "🇳🇱 Netherlands" },
  { value: "OTHER", label: "Other" },
];

const inputClassDark = 'w-full max-w-full min-w-0 box-border bg-[#111115] border border-white/[0.08] rounded-xl px-4 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all';
const inputClassLight = 'w-full max-w-full min-w-0 box-border bg-slate-50/80 border border-slate-200/90 rounded-xl px-4 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all';
const labelClassDark = 'block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2';
const labelClassLight = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2';


const OtpInput = ({ value, onChange, isDanger = false }: { value: string; onChange: (val: string) => void; isDanger?: boolean }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const activeColor = isDanger 
    ? (isDark ? 'border-rose-500 text-white bg-rose-500/10' : 'border-rose-500 text-slate-900 bg-rose-50') 
    : (isDark ? 'border-cyan-500 text-white bg-cyan-500/10' : 'border-cyan-600 text-slate-900 bg-white ring-2 ring-cyan-600/20');
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
                : (isDark ? 'border border-white/[0.08] text-zinc-600 bg-[#111115]' : 'border border-slate-200/90 text-slate-300 bg-slate-50/80')
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

  // Login Logs & Session State
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [loadingLoginLogs, setLoadingLoginLogs] = useState(false);
  const [currentIp, setCurrentIp] = useState('');
  const [loginLogsPage, setLoginLogsPage] = useState(1);
  const [loginLogsTotalPages, setLoginLogsTotalPages] = useState(1);
  const [loginLogsTotal, setLoginLogsTotal] = useState(0);
  const [revokingLogId, setRevokingLogId] = useState<number | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | number | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [confirmRevokeModal, setConfirmRevokeModal] = useState<{ isOpen: boolean; log: any | null }>({ isOpen: false, log: null });
  const [confirmRevokeAllModal, setConfirmRevokeAllModal] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ isOpen: boolean; log: any | null }>({ isOpen: false, log: null });
  const [confirmClearAllModal, setConfirmClearAllModal] = useState(false);

  const fetchLoginLogs = async (page = 1) => {
    setLoadingLoginLogs(true);
    try {
      const res = await fetch(`/api/user/security/login-logs?page=${page}&limit=5`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLoginLogs(data.logs || []);
        setCurrentIp(data.currentIp || '');
        if (data.pagination) {
          setLoginLogsPage(data.pagination.page);
          setLoginLogsTotalPages(data.pagination.totalPages);
          setLoginLogsTotal(data.pagination.total);
        }
      }
    } catch (err) {
      console.error('Failed to fetch login logs:', err);
    } finally {
      setLoadingLoginLogs(false);
    }
  };

  const handleRevokeSession = async (log: any) => {
    if (!log?.rawId) return;
    setRevokingLogId(log.rawId);
    try {
      const res = await fetch('/api/user/security/login-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', logId: log.rawId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isCurrentDevice) {
          toast.success('Signed out of this session successfully.');
          window.location.href = '/login';
          return;
        }
        toast.success(data.message || 'Device session revoked successfully.');
        fetchLoginLogs(loginLogsPage);
      } else {
        toast.error(data.error || 'Failed to revoke session.');
      }
    } catch {
      toast.error('Something went wrong while revoking the session.');
    } finally {
      setRevokingLogId(null);
      setConfirmRevokeModal({ isOpen: false, log: null });
    }
  };

  const handleRevokeAllOther = async () => {
    setIsRevokingAll(true);
    try {
      const res = await fetch('/api/user/security/login-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_all_other' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'All other device sessions revoked successfully.');
        fetchLoginLogs(1);
      } else {
        toast.error(data.error || 'Failed to revoke other sessions.');
      }
    } catch {
      toast.error('Something went wrong while revoking other sessions.');
    } finally {
      setIsRevokingAll(false);
      setConfirmRevokeAllModal(false);
    }
  };

  const handleDeleteLog = async (log: any) => {
    const targetId = log?.id || log?.rawId;
    if (!targetId) return;
    setDeletingLogId(targetId);
    try {
      const res = await fetch('/api/user/security/login-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', logId: targetId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Login record deleted successfully.');
        fetchLoginLogs(loginLogsPage);
      } else {
        toast.error(data.error || 'Failed to delete record.');
      }
    } catch {
      toast.error('Something went wrong while deleting record.');
    } finally {
      setDeletingLogId(null);
      setConfirmDeleteModal({ isOpen: false, log: null });
    }
  };

  const handleClearAllLogs = async () => {
    setIsClearingAll(true);
    try {
      const res = await fetch('/api/user/security/login-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_history' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Login history cleared successfully.');
        fetchLoginLogs(1);
      } else {
        toast.error(data.error || 'Failed to clear login history.');
      }
    } catch {
      toast.error('Something went wrong while clearing history.');
    } finally {
      setIsClearingAll(false);
      setConfirmClearAllModal(false);
    }
  };

  const getDeviceIcon = (device?: string) => {
    switch (device) {
      case 'Mobile':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'Tablet':
        return <Tablet className="w-3.5 h-3.5" />;
      case 'Desktop':
        return <Laptop className="w-3.5 h-3.5" />;
      default:
        return <Globe className="w-3.5 h-3.5" />;
    }
  };

  const hasOtherActiveSessions = loginLogs.some((l) => l.isSession && !l.isRevoked && !l.isCurrentDevice);

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${mins}`
      };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

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

  useEffect(() => {
    if (activeTab === 'security') {
      fetchLoginLogs();
    }
  }, [activeTab]);

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
    <motion.div className="space-y-6 pb-24 sm:pb-16 w-full max-w-full min-w-0 box-border" variants={containerVariants} initial="hidden" animate="visible">
      {/* Compact Unboxed Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Account Settings
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-700")}>
              <Settings className="w-3 h-3" /> Account Management
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm max-w-xl", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage your profile information, email address, password, and account security.
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-5 md:gap-6 items-stretch md:items-start w-full max-w-full min-w-0">
        {/* Navigation Sidebar (Sticky on mobile & desktop) */}
        <div className="w-full max-w-full md:w-60 shrink-0 sticky top-0 md:top-6 md:self-start lg:sticky lg:top-6 lg:self-start z-20 min-w-0 py-2 -my-2 md:py-0 md:my-0 bg-[#f8fafb]/90 dark:bg-[#000000]/90 md:bg-transparent md:dark:bg-transparent backdrop-blur-md md:backdrop-blur-none transition-all">
          <div className={cn("w-full max-w-full rounded-2xl p-1.5 sm:p-2 grid grid-cols-2 md:flex md:flex-col gap-1.5 border min-w-0 box-border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'profile' | 'security')}
                  className={`relative flex items-center justify-center md:justify-start gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl transition-all text-left shrink-0 w-full min-w-0 border cursor-pointer ${
                    isActive
                      ? (isDark ? 'bg-[#111115] text-white border-white/[0.12]' : 'bg-slate-100 text-slate-900 border-slate-200/90')
                      : (isDark ? 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50')
                  }`}
                >
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border ${isActive ? (isDark ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-white border-slate-200/90 text-cyan-700') : (isDark ? 'bg-white/[0.03] border-white/[0.08] text-zinc-400' : 'bg-slate-50/80 border-slate-200/90 text-slate-500')}`}>
                    <tab.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs sm:text-sm font-bold leading-none ${isActive ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-zinc-300' : 'text-slate-600')}`}>{tab.label}</div>
                    <div className={cn("hidden md:block text-[10px] mt-1.5 truncate", isDark ? "text-zinc-400" : "text-slate-400")}>{tab.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full max-w-full min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 w-full max-w-full min-w-0"
              >
                {/* Profile Picture Card */}
                <div className={cn("rounded-2xl p-4 sm:p-6 relative overflow-hidden border w-full max-w-full min-w-0 box-border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                  <div className="flex items-center gap-3.5 mb-6 relative z-10">
                    <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={cn("text-base md:text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Profile Picture</h3>
                      <p className={cn("text-xs md:text-sm mt-0.5 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Update your avatar and display photo.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 relative z-10">
                    <div className="relative group shrink-0">
                      <div className={cn("w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 relative", isDark ? "border-white/[0.08] bg-[#111115]" : "border-slate-200/90 bg-slate-100")}>
                        {imagePreview ? (
                          <img referrerPolicy="no-referrer" src={imagePreview} alt="Profile" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-600 to-blue-700">
                            <span className="text-4xl sm:text-5xl font-bold text-white">
                              {name ? name.charAt(0).toUpperCase() : <User className="w-12 h-12 sm:w-16 sm:h-16 text-white/80" />}
                            </span>
                          </div>
                        )}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                        >
                          <Upload className="w-6 h-6 sm:w-7 sm:h-7 mb-1 text-white" />
                          <span className="text-[11px] sm:text-xs font-bold text-white">Change</span>
                        </div>
                      </div>
                      <div 
                        className={cn("absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors border-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950", isDark ? "border-[#0a0a0c]" : "border-white")} 
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <h4 className={cn("font-bold text-base sm:text-lg mb-1 truncate", isDark ? "text-white" : "text-slate-900")}>{name || 'Your Name'}</h4>
                      <p className={cn("text-xs sm:text-sm mb-2.5 truncate", isDark ? "text-zinc-400" : "text-slate-500")}>{email}</p>
                      <div className="mb-3.5">
                        <span className={cn("text-[11px] rounded-lg px-2.5 py-1 border inline-block", isDark ? "text-zinc-400 bg-[#111115] border-white/[0.08]" : "text-slate-500 bg-slate-50/80 border-slate-200/90")}>
                          PNG or JPG · Max size 2MB
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
                        <button onClick={() => fileInputRef.current?.click()} className={cn("px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 border cursor-pointer", isDark ? "bg-[#111115] hover:bg-white/[0.06] text-zinc-200 border-white/[0.08]" : "bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200/90")}>
                          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Upload Photo
                        </button>
                        {imagePreview && (
                          <button onClick={() => setShowDeleteImageModal(true)} className={cn("px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border cursor-pointer", isDark ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600")}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Info Card */}
                <div className={cn("rounded-2xl p-4 sm:p-6 relative overflow-hidden border w-full max-w-full min-w-0 box-border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                  <div className="flex items-center gap-3.5 mb-6 relative z-10">
                    <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={cn("text-base md:text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Personal Information</h3>
                      <p className={cn("text-xs md:text-sm mt-0.5 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your display name and registered email address.</p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-5 relative z-10">
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
                          className={cn("text-xs font-semibold transition-colors px-2.5 py-1 rounded-lg border cursor-pointer", isDark ? "text-zinc-300 hover:text-white bg-[#111115] hover:bg-white/[0.06] border-white/[0.08]" : "text-slate-700 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 border-slate-200/90")}
                        >
                          Change Email
                        </button>
                      </div>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className={cn(inputClass, "opacity-75 cursor-not-allowed")}
                      />
                      <p className={cn("text-[11px] mt-1.5 ml-1", isDark ? "text-zinc-500" : "text-slate-400")}>Email can only be changed via OTP verification.</p>
                    </div>
                  </div>
                </div>

                {/* Billing Info Card */}
                <div className={cn("rounded-2xl p-4 sm:p-6 relative border w-full max-w-full min-w-0 box-border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                  <div className="flex items-center gap-3.5 mb-6 relative z-10">
                    <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={cn("text-base md:text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Billing Information</h3>
                      <p className={cn("text-xs md:text-sm mt-0.5 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Address and company details used for invoices and billing.</p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-5 relative z-20">
                    {/* Company Name */}
                    <div>
                      <label className={labelClass}>Company Name <span className={cn("normal-case font-normal", isDark ? "text-zinc-500" : "text-slate-400")}>(optional)</span></label>
                      <div className="relative">
                        <Briefcase className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none", isDark ? "text-zinc-500" : "text-slate-400")} />
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company or organization" className={cn(inputClass, "!pl-11 sm:!pl-11")} />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <div className="relative">
                        <Phone className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none", isDark ? "text-zinc-500" : "text-slate-400")} />
                        <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="+1 234 567 8900" className={cn(inputClass, "!pl-11 sm:!pl-11")} minLength={8} />
                      </div>
                    </div>

                    {/* Address 1 */}
                    <div>
                      <label className={labelClass}>Address</label>
                      <div className="relative mb-2.5">
                        <MapPin className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none", isDark ? "text-zinc-500" : "text-slate-400")} />
                        <input type="text" value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Street address" className={cn(inputClass, "!pl-11 sm:!pl-11")} />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-30">
                      <div>
                        <label className={labelClass}>Postal Code</label>
                        <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="10110" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Country</label>
                        <Select
                          value={
                            COUNTRY_OPTIONS.find(c => 
                              c.value.toLowerCase() === (country || '').toLowerCase() || 
                              c.label.toLowerCase().includes((country || '').toLowerCase())
                            )?.value || country
                          }
                          onChange={(val) => setCountry(val)}
                          options={COUNTRY_OPTIONS}
                          placeholder="Select country"
                          direction="auto"
                          className={cn(inputClass, "cursor-pointer")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={cn("pt-5 mt-6 border-t flex flex-col sm:flex-row justify-end items-stretch sm:items-center relative z-10", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                    <button
                      onClick={saveProfile}
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-slate-950 disabled:opacity-50 shadow-2xs bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 w-full sm:w-auto cursor-pointer"
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 w-full max-w-full min-w-0"
              >
                {/* Change Password Card */}
                <div className={cn("rounded-2xl p-4 sm:p-6 relative border w-full max-w-full min-w-0 box-border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                  
                  <div className="flex items-center gap-3.5 mb-6 relative z-10">
                    <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={cn("text-base md:text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Change Password</h3>
                      <p className={cn("text-xs md:text-sm mt-0.5 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Use a strong, unique password to keep your account safe.</p>
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
                        <button type="button" onClick={() => setShowOldPw(v => !v)} className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
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
                          <button type="button" onClick={() => setShowNewPw(v => !v)} className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
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
                          <button type="button" onClick={() => setShowConfirmPw(v => !v)} className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
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

                    <div className={cn("pt-5 mt-5 border-t flex flex-col sm:flex-row justify-end items-stretch sm:items-center relative z-10", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                      <button
                        type="submit"
                        disabled={isPasswordLoading}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-slate-950 disabled:opacity-50 shadow-2xs bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 w-full sm:w-auto cursor-pointer"
                      >
                        {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2FA Card */}
                <div className={cn("rounded-2xl p-4 sm:p-6 relative border w-full max-w-full min-w-0 box-border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                  {/* Header */}
                  <div className={cn("flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-3 sm:gap-4 mb-5 relative z-10 pb-4 border-b transition-colors w-full min-w-0", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                    <div className="flex items-center gap-3.5 min-w-0 flex-1 w-full">
                      <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border shrink-0 transition-colors", twoFactorEnabled ? (isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700") : (isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600"))}>
                        {twoFactorEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn("text-base md:text-lg font-bold leading-tight break-words", isDark ? "text-white" : "text-slate-900")}>Two-Factor Authentication (2FA)</h3>
                        </div>
                        <p className={cn("text-xs md:text-sm mt-0.5 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Add an extra layer of security with Time-based One-Time Passwords (TOTP).
                        </p>
                      </div>
                    </div>

                    <div className="self-start sm:self-auto shrink-0">
                      {twoFactorEnabled ? (
                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active &amp; Protected
                        </span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-[#111115] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-700")}>
                          <span className="w-2 h-2 rounded-full bg-zinc-400" /> Not Configured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Authenticator Row (Locked Horizontal Alignment on ALL screens) */}
                  <div className={cn(
                    "relative z-10 rounded-xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 mb-5 transition-all w-full max-w-full min-w-0 box-border",
                    twoFactorEnabled
                      ? (isDark ? "bg-[#111115] border-emerald-500/30" : "bg-slate-50/80 border-emerald-200")
                      : (isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")
                  )}>
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                      <div className={cn(
                        "w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
                        twoFactorEnabled
                          ? (isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border-emerald-200")
                          : (isDark ? "bg-white/[0.03] border-white/[0.08] text-cyan-400" : "bg-white border-slate-200/90 text-cyan-600")
                      )}>
                        <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={cn("font-bold text-xs sm:text-sm", isDark ? "text-white" : "text-slate-900")}>
                            Authenticator App
                          </h4>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                            twoFactorEnabled
                              ? (isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")
                              : (isDark ? "bg-white/[0.04] border-white/[0.08] text-zinc-400" : "bg-white border-slate-200/90 text-slate-600")
                          )}>
                            {twoFactorEnabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className={cn("text-xs mt-0.5 truncate sm:whitespace-normal", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={twoFactorEnabled}
                        aria-label="Toggle Two-Factor Authentication"
                        onClick={handle2FAToggle}
                        disabled={is2FALoading}
                        className={cn(
                          "relative inline-flex h-7 w-13 items-center rounded-full transition-all cursor-pointer border disabled:opacity-50 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
                          twoFactorEnabled
                            ? "bg-cyan-500 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                            : (isDark ? "bg-zinc-800 border-zinc-700 hover:border-zinc-600" : "bg-slate-200 border-slate-300 hover:border-slate-400")
                        )}
                      >
                        {is2FALoading ? (
                          <Loader2 className={cn("w-3.5 h-3.5 animate-spin mx-auto", twoFactorEnabled ? "text-slate-950" : (isDark ? "text-white" : "text-slate-900"))} />
                        ) : (
                          <span className={cn(
                            "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md",
                            twoFactorEnabled ? "translate-x-7" : "translate-x-1"
                          )} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 3 Security Pillars / Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-5 relative z-10">
                    <div className={cn("p-3 rounded-xl border flex items-center gap-3", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-xs font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>6-Digit TOTP</div>
                        <div className={cn("text-[10px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Refreshed every 30s</div>
                      </div>
                    </div>

                    <div className={cn("p-3 rounded-xl border flex items-center gap-3", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-xs font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Brute-Force Guard</div>
                        <div className={cn("text-[10px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Protects password leaks</div>
                      </div>
                    </div>

                    <div className={cn("p-3 rounded-xl border flex items-center gap-3", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-xs font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Universal Support</div>
                        <div className={cn("text-[10px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>iOS, Android, macOS, Win</div>
                      </div>
                    </div>
                  </div>

                  {/* Security Notice / Call to Action Alert Box */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border text-xs leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10",
                    twoFactorEnabled
                      ? (isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200/90" : "bg-emerald-50 border-emerald-200 text-emerald-900")
                      : (isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200/90" : "bg-slate-50/80 border-slate-200/90 text-slate-700")
                  )}>
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {twoFactorEnabled ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs">
                        {twoFactorEnabled
                          ? "Two-Factor Authentication is active. Each new login requires a one-time verification token from your authenticator app."
                          : "2FA is currently disabled. We strongly recommend enabling Two-Factor Authentication to protect your servers, VPS instances, and account balance."}
                      </p>
                    </div>

                    {!twoFactorEnabled && (
                      <button
                        type="button"
                        onClick={handle2FAToggle}
                        disabled={is2FALoading}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all shrink-0 cursor-pointer shadow-2xs self-start sm:self-auto"
                      >
                        Setup 2FA
                      </button>
                    )}
                  </div>
                </div>

                {/* Security & Login History Card */}
                <div className={cn("rounded-2xl p-4 sm:p-6 relative overflow-hidden border w-full max-w-full min-w-0 box-border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10 w-full min-w-0">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1 w-full">
                      <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border shrink-0", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
                        <History className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={cn("text-base md:text-lg font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>Sessions & Login History</h3>
                        <p className={cn("text-xs md:text-sm mt-0.5 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Monitor active devices and account login activity.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap w-full sm:w-auto">
                      {loginLogs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setConfirmClearAllModal(true)}
                          disabled={isClearingAll || loadingLoginLogs}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50",
                            isDark
                              ? "border-white/[0.08] hover:border-rose-500/40 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400"
                              : "border-slate-200/90 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                          )}
                        >
                          {isClearingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          <span>Clear History</span>
                        </button>
                      )}

                      {hasOtherActiveSessions && (
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeAllModal(true)}
                          disabled={isRevokingAll || loadingLoginLogs}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50",
                            isDark
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                              : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                          )}
                        >
                          {isRevokingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                          <span>Revoke Other Sessions</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => fetchLoginLogs(loginLogsPage)}
                        disabled={loadingLoginLogs}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                          isDark
                            ? "border-white/[0.08] hover:border-white/[0.16] bg-[#111115] text-zinc-300 hover:text-white"
                            : "border-slate-200/90 hover:border-slate-300 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", loadingLoginLogs && "animate-spin text-cyan-400")} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>

                  {/* Logs Table / List Container */}
                  <div className={cn("relative z-10 rounded-xl border overflow-hidden", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-white border-slate-200/90")}>
                    {loadingLoginLogs ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                        <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>Loading sessions & login history...</span>
                      </div>
                    ) : loginLogs.length === 0 ? (
                      <div className={cn("py-10 text-center text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                        No login activity recorded yet.
                      </div>
                    ) : (
                      <>
                        {/* ── Desktop View (md+) ── */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className={cn("uppercase tracking-wider font-semibold border-b text-[11px]", isDark ? "bg-[#111115] text-zinc-400 border-white/[0.08]" : "bg-slate-50/80 text-slate-500 border-slate-200/90")}>
                                <th className="py-3 px-4 whitespace-nowrap">Device & Browser</th>
                                <th className="py-3 px-4 w-36 whitespace-nowrap">IP Address</th>
                                <th className="py-3 px-4 w-32 whitespace-nowrap">Login Time</th>
                                <th className="py-3 px-4">Details / Method</th>
                                <th className="py-3 px-4 text-right whitespace-nowrap">Status & Actions</th>
                              </tr>
                            </thead>
                            <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-200/90")}>
                              {loginLogs.map((log) => {
                                const dt = formatDateTime(log.createdAt);
                                return (
                                  <tr key={log.id} className={cn("transition-colors", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}>
                                    <td className="py-3 px-4 align-middle">
                                      <div className="flex items-center gap-2.5">
                                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                                          <BrowserIcon browser={log.browser || log.deviceLabel} device={log.device} className="w-4 h-4 shrink-0" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className={cn("text-xs font-semibold truncate", isDark ? "text-zinc-200" : "text-slate-800")}>
                                            {log.deviceLabel || 'Web Device'}
                                          </span>
                                          {log.isCurrentDevice && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-0.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                              This Device (Active)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs align-middle whitespace-nowrap">
                                      <span className={isDark ? "text-zinc-300" : "text-slate-700"}>{log.ipAddress}</span>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-[11px] align-middle whitespace-nowrap">
                                      <div className="flex flex-col leading-tight">
                                        <span className={isDark ? "text-zinc-200" : "text-slate-800"}>{dt.date}</span>
                                        <span className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-slate-400")}>{dt.time}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 align-middle text-xs">
                                      <div className="flex flex-col">
                                        <span className={cn("font-medium text-[11px]", isDark ? "text-zinc-300" : "text-slate-700")}>{log.method}</span>
                                        <span className="text-[10px] opacity-75">{log.description}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {log.status === 'SUCCESS' ? (
                                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
                                            <CheckCircle2 className="w-3 h-3" /> Active
                                          </span>
                                        ) : log.status === 'REVOKED' ? (
                                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400" : "bg-slate-100 border-slate-200/90 text-slate-500")}>
                                            Signed Out
                                          </span>
                                        ) : (
                                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-700")}>
                                            <AlertTriangle className="w-3 h-3" /> Failed
                                          </span>
                                        )}

                                        {log.isSession && log.status === 'SUCCESS' && (
                                          <button
                                            type="button"
                                            onClick={() => setConfirmRevokeModal({ isOpen: true, log })}
                                            disabled={revokingLogId === log.rawId}
                                            className={cn(
                                              "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer disabled:opacity-50",
                                              log.isCurrentDevice
                                                ? (isDark ? "border-white/[0.08] hover:border-white/[0.16] bg-[#111115] text-zinc-300 hover:text-white" : "border-slate-200/90 bg-slate-100 text-slate-700 hover:bg-slate-200")
                                                : (isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100")
                                            )}
                                          >
                                            {revokingLogId === log.rawId ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <LogOut className="w-3 h-3" />
                                            )}
                                            <span>Sign Out</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteModal({ isOpen: true, log })}
                                          disabled={deletingLogId === (log.id || log.rawId)}
                                          title="Delete login record"
                                          className={cn(
                                            "inline-flex items-center justify-center p-1.5 rounded-lg text-[10px] border transition-all cursor-pointer disabled:opacity-50",
                                            isDark
                                              ? "border-white/[0.08] hover:border-rose-500/40 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400"
                                              : "border-slate-200/90 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                          )}
                                        >
                                          {deletingLogId === (log.id || log.rawId) ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* ── Mobile View (<md) ── */}
                        <div className={cn("block md:hidden divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-200/90")}>
                          {loginLogs.map((log) => {
                            const dt = formatDateTime(log.createdAt);
                            return (
                              <div key={log.id} className="p-3.5 space-y-2.5 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                                      <BrowserIcon browser={log.browser || log.deviceLabel} device={log.device} className="w-4 h-4 shrink-0" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className={cn("text-xs font-bold leading-tight truncate", isDark ? "text-white" : "text-slate-900")}>
                                        {log.deviceLabel || 'Web Device'}
                                      </h4>
                                      {log.isCurrentDevice ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-0.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                          This Device (Active)
                                        </span>
                                      ) : (
                                        <span className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-slate-400")}>
                                          {log.device || 'Other Device'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {log.status === 'SUCCESS' ? (
                                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
                                        <CheckCircle2 className="w-3 h-3" /> Active
                                      </span>
                                    ) : log.status === 'REVOKED' ? (
                                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400" : "bg-slate-100 border-slate-200/90 text-slate-500")}>
                                        Signed Out
                                      </span>
                                    ) : (
                                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-700")}>
                                        <AlertTriangle className="w-3 h-3" /> Failed
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Compact Mobile Details */}
                                <div className={cn("rounded-xl p-2.5 text-[11px] space-y-1.5 border", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>IP Address</span>
                                    <span className={cn("font-mono font-medium break-all text-right text-[11px]", isDark ? "text-zinc-200" : "text-slate-800")}>{log.ipAddress}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>Login Time</span>
                                    <span className={cn("font-mono text-[10px]", isDark ? "text-zinc-300" : "text-slate-700")}>{dt.date} • {dt.time}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>Method</span>
                                    <span className={cn("text-[10px] truncate max-w-[170px]", isDark ? "text-zinc-300" : "text-slate-700")}>{log.method}</span>
                                  </div>
                                </div>

                                {/* Mobile Action Buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                  {log.isSession && log.status === 'SUCCESS' && (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmRevokeModal({ isOpen: true, log })}
                                      disabled={revokingLogId === log.rawId}
                                      className={cn(
                                        "flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50",
                                        log.isCurrentDevice
                                          ? (isDark ? "border-white/[0.08] bg-[#111115] text-zinc-200 hover:text-white" : "border-slate-200/90 bg-slate-100 text-slate-800 hover:bg-slate-200")
                                          : (isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100")
                                      )}
                                    >
                                      {revokingLogId === log.rawId ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <LogOut className="w-3.5 h-3.5" />
                                      )}
                                      <span>{log.isCurrentDevice ? "Sign Out" : "Sign Out Device"}</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteModal({ isOpen: true, log })}
                                    disabled={deletingLogId === (log.id || log.rawId)}
                                    className={cn(
                                      "py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50",
                                      log.isSession && log.status === 'SUCCESS' ? "w-auto" : "w-full",
                                      isDark
                                        ? "border-white/[0.08] hover:border-rose-500/40 bg-[#111115] hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400"
                                        : "border-slate-200/90 hover:border-rose-300 bg-slate-50/80 hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                                    )}
                                  >
                                    {deletingLogId === (log.id || log.rawId) ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* ── Pagination Bar ── */}
                        <div className={cn("p-3 sm:p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs", isDark ? "border-white/[0.08] bg-[#111115]" : "border-slate-200/90 bg-slate-50/80")}>
                          <span className={cn("text-[11px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                            Showing <strong className={isDark ? "text-white" : "text-slate-900"}>{loginLogs.length}</strong> of <strong className={isDark ? "text-white" : "text-slate-900"}>{loginLogsTotal}</strong> login records
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fetchLoginLogs(loginLogsPage - 1)}
                              disabled={loginLogsPage <= 1 || loadingLoginLogs}
                              className={cn(
                                "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
                                isDark ? "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:text-white hover:border-white/[0.16]" : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100"
                              )}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Previous</span>
                            </button>

                            <span className={cn("px-2 text-xs font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>
                              {loginLogsPage} / {loginLogsTotalPages}
                            </span>

                            <button
                              type="button"
                              onClick={() => fetchLoginLogs(loginLogsPage + 1)}
                              disabled={loginLogsPage >= loginLogsTotalPages || loadingLoginLogs}
                              className={cn(
                                "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
                                isDark ? "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:text-white hover:border-white/[0.16]" : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100"
                              )}
                            >
                              <span className="hidden sm:inline">Next</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className={cn("mt-4 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs", isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400" : "bg-slate-50/80 border-slate-200/90 text-slate-600")}>
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Account Security Tip:</strong> If you notice an unrecognized device or login time, immediately click <em>Sign Out</em> on that session and update your password.
                    </p>
                  </div>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("rounded-2xl border p-5 sm:p-6 w-full max-w-md shadow-2xl relative overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <button onClick={() => setShowOtpModal(false)} className={cn("absolute top-4 right-4 sm:top-5 sm:right-5 transition-colors p-2 rounded-xl cursor-pointer", isDark ? "text-zinc-400 hover:text-white bg-[#111115] hover:bg-white/[0.08]" : "text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200")}><X className="w-4 h-4" /></button>
              <div className="text-center mb-6 relative z-10">
                <div className={cn("w-14 h-14 sm:w-16 sm:h-16 border rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
                  <KeyRound className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h3 className={cn("text-xl sm:text-2xl font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>Verify Password Change</h3>
                <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>We've sent a 6-digit code to your email. Enter it below to confirm the change.</p>
              </div>
              <div className="space-y-4 relative z-10">
                <OtpInput value={otpCode} onChange={setOtpCode} />
                <div className="flex gap-2.5 sm:gap-3 pt-2">
                  <button onClick={() => setShowOtpModal(false)} className={cn("flex-1 px-4 py-2.5 rounded-xl border font-medium text-xs sm:text-sm transition-colors cursor-pointer", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]" : "border-slate-200/90 text-slate-700 hover:bg-slate-100")}>Cancel</button>
                  <button onClick={handleVerifyOtp} disabled={isVerifyingOtp || otpCode.length < 6} className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("rounded-2xl border p-5 sm:p-6 w-full max-w-md shadow-2xl relative overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <button onClick={() => { setShowEmailModal(false); setEmailOtpStep(false); }} className={cn("absolute top-4 right-4 sm:top-5 sm:right-5 transition-colors p-2 rounded-xl cursor-pointer", isDark ? "text-zinc-400 hover:text-white bg-[#111115] hover:bg-white/[0.08]" : "text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200")}><X className="w-4 h-4" /></button>

              <div className="text-center mb-6 relative z-10">
                <div className={cn("w-14 h-14 sm:w-16 sm:h-16 border rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
                  <Mail className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h3 className={cn("text-xl sm:text-2xl font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>Change Email Address</h3>
              </div>

              {!emailOtpStep ? (
                <form onSubmit={handleEmailRequest} className="space-y-4 relative z-10">
                  <p className={cn("text-xs sm:text-sm text-center -mt-2 mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>Enter your new email. We'll send a verification code to your <strong className={isDark ? "text-white" : "text-slate-900"}>current</strong> email.</p>
                  <div>
                    <label className={labelClass}>New Email Address</label>
                    <input type="email" required value={newEmailInput} onChange={(e) => setNewEmailInput(e.target.value)} className={inputClass} placeholder="new@example.com" />
                  </div>
                  <div className="flex gap-2.5 sm:gap-3 pt-2">
                    <button type="button" onClick={() => setShowEmailModal(false)} className={cn("flex-1 px-4 py-2.5 rounded-xl border font-medium text-xs sm:text-sm transition-colors cursor-pointer", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]" : "border-slate-200/90 text-slate-700 hover:bg-slate-100")}>Cancel</button>
                    <button type="submit" disabled={isEmailLoading || !newEmailInput} className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold shadow-2xs disabled:opacity-50 transition-all cursor-pointer">
                      {isEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 relative z-10">
                  <p className={cn("text-xs sm:text-sm text-center -mt-2 mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>We've sent a code to <strong className={isDark ? "text-white" : "text-slate-900"}>{email}</strong>. Enter it to confirm changing to <strong className="text-cyan-400">{newEmailInput}</strong>.</p>
                  <OtpInput value={emailOtpCode} onChange={setEmailOtpCode} />
                  <div className="flex gap-2.5 sm:gap-3">
                    <button onClick={() => { setEmailOtpStep(false); setEmailOtpCode(''); }} className={cn("flex-1 px-4 py-2.5 rounded-xl border font-medium text-xs sm:text-sm transition-colors cursor-pointer", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]" : "border-slate-200/90 text-slate-700 hover:bg-slate-100")}>Back</button>
                    <button onClick={handleVerifyEmailOtp} disabled={isEmailLoading || emailOtpCode.length < 6} className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold shadow-2xs disabled:opacity-50 transition-all cursor-pointer">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("rounded-2xl border p-5 sm:p-6 w-full max-w-md shadow-2xl relative overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <button onClick={() => setShowTwoFactorModal(false)} className={cn("absolute top-4 right-4 sm:top-5 sm:right-5 transition-colors p-2 rounded-xl cursor-pointer", isDark ? "text-zinc-400 hover:text-white bg-[#111115] hover:bg-white/[0.08]" : "text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200")}><X className="w-4 h-4" /></button>

              <div className="text-center mb-6 relative z-10">
                <div className={cn("w-14 h-14 sm:w-16 sm:h-16 border rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4", isDark ? "bg-[#111115] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-600")}>
                  <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h3 className={cn("text-xl sm:text-2xl font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>Setup 2FA</h3>
                <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Scan this QR code with Google Authenticator or Authy.</p>
              </div>

              <div className="flex justify-center mb-6 relative z-10">
                <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  {qrCodeUrl && <img referrerPolicy="no-referrer" src={qrCodeUrl} alt="QR Code" className="w-40 h-40 sm:w-48 sm:h-48" loading="lazy" decoding="async" />}
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <label className={labelClass}>Verification Code</label>
                  <OtpInput value={twoFactorCode} onChange={setTwoFactorCode} />
                </div>
                <div className="flex gap-2.5 sm:gap-3 pt-2">
                  <button onClick={() => setShowTwoFactorModal(false)} className={cn("flex-1 px-4 py-2.5 rounded-xl border font-medium text-xs sm:text-sm transition-colors cursor-pointer", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]" : "border-slate-200/90 text-slate-700 hover:bg-slate-100")}>Cancel</button>
                  <button onClick={handleVerify2FA} disabled={is2FALoading || twoFactorCode.length < 6} className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold shadow-2xs disabled:opacity-50 transition-all cursor-pointer">
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

      {/* Revoke Session Confirm Modal */}
      <ConfirmModal
        isOpen={confirmRevokeModal.isOpen}
        onClose={() => setConfirmRevokeModal({ isOpen: false, log: null })}
        onConfirm={() => confirmRevokeModal.log && handleRevokeSession(confirmRevokeModal.log)}
        title={confirmRevokeModal.log?.isCurrentDevice ? "Sign Out of This Session?" : "Sign Out Device?"}
        description={
          confirmRevokeModal.log?.isCurrentDevice
            ? "You will be signed out of this browser session and redirected to the login page."
            : `The login session on ${confirmRevokeModal.log?.deviceLabel || 'this device'} (IP: ${confirmRevokeModal.log?.ipAddress}) will be terminated immediately.`
        }
        confirmText={confirmRevokeModal.log?.isCurrentDevice ? "Sign Out Now" : "Sign Out"}
        cancelText="Cancel"
        variant="danger"
        isLoading={revokingLogId !== null}
        icon={<LogOut className="w-8 h-8" />}
      />

      {/* Revoke All Other Sessions Confirm Modal */}
      <ConfirmModal
        isOpen={confirmRevokeAllModal}
        onClose={() => setConfirmRevokeAllModal(false)}
        onConfirm={handleRevokeAllOther}
        title="Revoke All Other Sessions?"
        description="All active login sessions on other devices will be terminated immediately. You will remain signed in on this current device."
        confirmText="Revoke All"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRevokingAll}
        icon={<ShieldAlert className="w-8 h-8" />}
      />

      {/* Delete Single Log Modal */}
      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        onClose={() => setConfirmDeleteModal({ isOpen: false, log: null })}
        onConfirm={() => confirmDeleteModal.log && handleDeleteLog(confirmDeleteModal.log)}
        title="Delete Login Record?"
        description={`Remove login record for ${confirmDeleteModal.log?.deviceLabel || 'this device'} (${confirmDeleteModal.log?.ipAddress || ''}) from your history?`}
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingLogId !== null}
        icon={<Trash2 className="w-8 h-8" />}
      />

      {/* Clear All Logs Modal */}
      <ConfirmModal
        isOpen={confirmClearAllModal}
        onClose={() => setConfirmClearAllModal(false)}
        onConfirm={handleClearAllLogs}
        title="Clear Login History?"
        description="All past login records and session history will be cleared. Your currently active session will remain logged in."
        confirmText="Clear All History"
        cancelText="Cancel"
        variant="danger"
        isLoading={isClearingAll}
        icon={<Trash2 className="w-8 h-8" />}
      />
    </motion.div>
  );
}