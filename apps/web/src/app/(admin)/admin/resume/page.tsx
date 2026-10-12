"use client";
import { useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X, BookOpen, Briefcase, GripVertical, Award, CheckCircle , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { motion, Reorder } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "sonner";
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminResumePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, eduRes, certRes] = await Promise.all([
        fetch('/api/admin/resume/experience'),
        fetch('/api/admin/resume/education'),
        fetch('/api/admin/resume/certification')
      ]);
      const expData = await expRes.json();
      const eduData = await eduRes.json();
      const certData = await certRes.json();
      if (!expData.error) setExperiences(expData);
      if (!eduData.error) setEducations(eduData);
      if (!certData.error) setCertifications(certData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useUrlTab<'experience' | 'education' | 'certification'>('experience', { allowed: ['experience', 'education', 'certification'] as const });
  
  // Data States
  const [experiences, setExperiences] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [showExpForm, setShowExpForm] = useState(false);
  const [showEduForm, setShowEduForm] = useState(false);
  const [showCertForm, setShowCertForm] = useState(false);
  
  const [expFormData, setExpFormData] = useState({ id: null, year: '', role: '', company: '' });
  const [eduFormData, setEduFormData] = useState({ id: null, year: '', degree: '', school: '' });
  const [certFormData, setCertFormData] = useState({ id: null, title: '', org: '', date: '', icon: '' });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'experience' | 'education' | 'certification', id: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);


  const saveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = expFormData.id ? 'PUT' : 'POST';
      const url = expFormData.id ? `/api/admin/resume/experience/${expFormData.id}` : '/api/admin/resume/experience';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expFormData)
      });
      if (res.ok) {
        setShowExpForm(false);
        fetchData();
        toast.success(expFormData.id ? 'Experience updated successfully!' : 'Experience added successfully!');
      } else {
        toast.error('Failed to save experience');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = eduFormData.id ? 'PUT' : 'POST';
      const url = eduFormData.id ? `/api/admin/resume/education/${eduFormData.id}` : '/api/admin/resume/education';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eduFormData)
      });
      if (res.ok) {
        setShowEduForm(false);
        fetchData();
        toast.success(eduFormData.id ? 'Education updated successfully!' : 'Education added successfully!');
      } else {
        toast.error('Failed to save education');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = certFormData.id ? 'PUT' : 'POST';
      const url = certFormData.id ? `/api/admin/resume/certification/${certFormData.id}` : '/api/admin/resume/certification';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certFormData)
      });
      if (res.ok) {
        setShowCertForm(false);
        fetchData();
        toast.success(certFormData.id ? 'Certification updated successfully!' : 'Certification added successfully!');
      } else {
        toast.error('Failed to save certification');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'experience') {
        await fetch(`/api/admin/resume/experience/${deleteTarget.id}`, { method: 'DELETE' });
      } else if (deleteTarget.type === 'education') {
        await fetch(`/api/admin/resume/education/${deleteTarget.id}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/admin/resume/certification/${deleteTarget.id}`, { method: 'DELETE' });
      }
      fetchData();
      toast.success('Data deleted successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete data');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReorder = async (type: 'experience' | 'education' | 'certification', newOrder: any[]) => {
    if (type === 'experience') setExperiences(newOrder);
    else if (type === 'education') setEducations(newOrder);
    else setCertifications(newOrder);

    const items = newOrder.map((item, index) => ({ id: item.id, order: index }));

    try {
      await fetch('/api/admin/resume/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, items })
      });
    } catch (err) {
      console.error('Failed to save order');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Resume Data</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your professional experience, education, and certifications.</p>
        </div>
      </div>

      {/* Tabs & Actions */}
      <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4", isDark ? "border-white/10" : "border-slate-200")}>
        <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide w-full sm:w-auto">
        <button
          onClick={() => setActiveTab('experience')}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap shadow-inner", activeTab === "experience" ? (isDark ? "bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-white text-cyan-700 border border-slate-200 shadow-sm") : (isDark ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10" : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"))}
        >
          <Briefcase className="w-4 h-4 shrink-0" /> Experience
        </button>
        <button
          onClick={() => setActiveTab('education')}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap shadow-inner", activeTab === "education" ? (isDark ? "bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-white text-cyan-700 border border-slate-200 shadow-sm") : (isDark ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10" : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"))}
        >
          <BookOpen className="w-4 h-4 shrink-0" /> Education
        </button>
        <button
          onClick={() => setActiveTab('certification')}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap shadow-inner", activeTab === "certification" ? (isDark ? "bg-cyan-500 text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-white text-cyan-700 border border-slate-200 shadow-sm") : (isDark ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10" : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"))}
        >
          <Award className="w-4 h-4 shrink-0" /> Certifications
        </button>
        </div>
        <div className="shrink-0 w-full sm:w-auto flex justify-end">
          {activeTab === 'experience' && (
            <button onClick={() => { setExpFormData({ id: null, year: '', role: '', company: '' }); setShowExpForm(true); }} className={cn("font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>
              <Plus className="w-4 h-4" /> Add Experience
            </button>
          )}
          {activeTab === 'education' && (
            <button onClick={() => { setEduFormData({ id: null, year: '', degree: '', school: '' }); setShowEduForm(true); }} className={cn("font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>
              <Plus className="w-4 h-4" /> Add Education
            </button>
          )}
          {activeTab === 'certification' && (
            <button onClick={() => { setCertFormData({ id: null, title: '', org: '', date: '', icon: '' }); setShowCertForm(true); }} className={cn("font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>
              <Plus className="w-4 h-4" /> Add Certification
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <AdminLoader className="min-h-[250px] py-12" />
      ) : (
        <div className="mt-6">
          {/* EXPERIENCE TAB */}
          {activeTab === 'experience' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>


              {showExpForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={cn("glass-card border rounded-2xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden", isDark ? "border-cyan-500/30" : "bg-white border-slate-200")} onSubmit={saveExperience}>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-cyan-500"></div>
                  <h3 className={cn("text-xl font-extrabold mb-6 pb-4 border-b", isDark ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm border-white/10" : "text-slate-900 border-slate-200")}>{expFormData.id ? 'Edit' : 'Add'} Experience</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Year *</label>
                      <input required value={expFormData.year} onChange={e => setExpFormData({...expFormData, year: e.target.value})} placeholder="e.g., 2020 - 2022" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Role *</label>
                      <input required value={expFormData.role} onChange={e => setExpFormData({...expFormData, role: e.target.value})} placeholder="e.g., Frontend Developer" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Company *</label>
                      <input required value={expFormData.company} onChange={e => setExpFormData({...expFormData, company: e.target.value})} placeholder="e.g., Google" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                  </div>
                  <div className={cn("flex justify-end gap-3 pt-2 border-t mt-2", isDark ? "border-white/10" : "border-slate-200")}>
                    <button type="button" onClick={() => setShowExpForm(false)} className={cn("px-5 py-2.5 rounded-xl font-bold hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className={cn(" px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>{isSubmitting ? <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/30" : "border-slate-200")} /> : <CheckCircle className="w-4 h-4" />} {isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </motion.form>
              )}

              <Reorder.Group axis="y" values={experiences} onReorder={(newOrder) => handleReorder('experience', newOrder)} className="space-y-4">
                {experiences.map(exp => (
                  <Reorder.Item key={exp.id} value={exp} className={cn("glass-card border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all cursor-grab active:cursor-grabbing shadow-lg group", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                    <div className="flex items-start md:items-center gap-4">
                      <div className={cn("transition-colors mt-1 md:mt-0", isDark ? "text-zinc-500 hover:text-cyan-400" : "text-slate-400 hover:text-cyan-600")}>
                        <GripVertical className="w-6 h-6" />
                      </div>
                      <div>
                        <div className={cn("inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border mb-2", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>{exp.year}</div>
                        <h4 className={cn("text-xl font-extrabold mb-1", isDark ? "text-white" : "text-slate-900")}>{exp.role}</h4>
                        <div className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Briefcase className="w-4 h-4" /> {exp.company}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end md:self-auto">
                      <button onClick={() => { setExpFormData(exp); setShowExpForm(true); }} className={cn("p-2.5 border rounded-xl transition-all shadow-inner", isDark ? "border-white/10 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10" : "border-slate-200 text-slate-500 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50")}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'experience', id: exp.id })} className={cn("p-2.5 border rounded-xl transition-all shadow-inner", isDark ? "border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10" : "border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </motion.div>
          )}

          {/* EDUCATION TAB */}
          {activeTab === 'education' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>


              {showEduForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={cn("glass-card border rounded-2xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden", isDark ? "border-cyan-500/30" : "bg-white border-slate-200")} onSubmit={saveEducation}>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-cyan-500"></div>
                  <h3 className={cn("text-xl font-extrabold mb-6 pb-4 border-b", isDark ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm border-white/10" : "text-slate-900 border-slate-200")}>{eduFormData.id ? 'Edit' : 'Add'} Education</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Year *</label>
                      <input required value={eduFormData.year} onChange={e => setEduFormData({...eduFormData, year: e.target.value})} placeholder="e.g., 2020 - 2024" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Degree *</label>
                      <input required value={eduFormData.degree} onChange={e => setEduFormData({...eduFormData, degree: e.target.value})} placeholder="e.g., B.S. Computer Science" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>School *</label>
                      <input required value={eduFormData.school} onChange={e => setEduFormData({...eduFormData, school: e.target.value})} placeholder="e.g., Harvard University" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                  </div>
                  <div className={cn("flex justify-end gap-3 pt-2 border-t mt-2", isDark ? "border-white/10" : "border-slate-200")}>
                    <button type="button" onClick={() => setShowEduForm(false)} className={cn("px-5 py-2.5 rounded-xl font-bold hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className={cn(" px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>{isSubmitting ? <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/30" : "border-slate-200")} /> : <CheckCircle className="w-4 h-4" />} {isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </motion.form>
              )}

              <Reorder.Group axis="y" values={educations} onReorder={(newOrder) => handleReorder('education', newOrder)} className="space-y-4">
                {educations.map(edu => (
                  <Reorder.Item key={edu.id} value={edu} className={cn("glass-card border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all cursor-grab active:cursor-grabbing shadow-lg group", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                    <div className="flex items-start md:items-center gap-4">
                      <div className={cn("transition-colors mt-1 md:mt-0", isDark ? "text-zinc-500 hover:text-cyan-400" : "text-slate-400 hover:text-cyan-600")}>
                        <GripVertical className="w-6 h-6" />
                      </div>
                      <div>
                        <div className={cn("inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border mb-2", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>{edu.year}</div>
                        <h4 className={cn("text-xl font-extrabold mb-1", isDark ? "text-white" : "text-slate-900")}>{edu.degree}</h4>
                        <div className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><BookOpen className="w-4 h-4" /> {edu.school}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end md:self-auto">
                      <button onClick={() => { setEduFormData(edu); setShowEduForm(true); }} className={cn("p-2.5 border rounded-xl transition-all shadow-inner", isDark ? "border-white/10 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10" : "border-slate-200 text-slate-500 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50")}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'education', id: edu.id })} className={cn("p-2.5 border rounded-xl transition-all shadow-inner", isDark ? "border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10" : "border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </motion.div>
          )}

          {/* CERTIFICATION TAB */}
          {activeTab === 'certification' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>


              {showCertForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={cn("glass-card border rounded-2xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden", isDark ? "border-cyan-500/30" : "bg-white border-slate-200")} onSubmit={saveCertification}>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-cyan-500"></div>
                  <h3 className={cn("text-xl font-extrabold mb-6 pb-4 border-b", isDark ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm border-white/10" : "text-slate-900 border-slate-200")}>{certFormData.id ? 'Edit' : 'Add'} Certification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Title *</label>
                      <input required value={certFormData.title} onChange={e => setCertFormData({...certFormData, title: e.target.value})} placeholder="e.g., AWS Certified Solutions Architect" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Organization *</label>
                      <input required value={certFormData.org} onChange={e => setCertFormData({...certFormData, org: e.target.value})} placeholder="e.g., Amazon Web Services" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Date *</label>
                      <input required value={certFormData.date} onChange={e => setCertFormData({...certFormData, date: e.target.value})} placeholder="e.g., 2024" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Icon Name (Lucide)</label>
                      <input value={certFormData.icon} onChange={e => setCertFormData({...certFormData, icon: e.target.value})} placeholder="e.g., Award, Shield, CheckCircle" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")} />
                    </div>
                  </div>
                  <div className={cn("flex justify-end gap-3 pt-2 border-t mt-2", isDark ? "border-white/10" : "border-slate-200")}>
                    <button type="button" onClick={() => setShowCertForm(false)} className={cn("px-5 py-2.5 rounded-xl font-bold hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className={cn(" px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>{isSubmitting ? <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/30" : "border-slate-200")} /> : <CheckCircle className="w-4 h-4" />} {isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </motion.form>
              )}

              <Reorder.Group axis="y" values={certifications} onReorder={(newOrder) => handleReorder('certification', newOrder)} className="space-y-4">
                {certifications.map(cert => (
                  <Reorder.Item key={cert.id} value={cert} className={cn("glass-card border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all cursor-grab active:cursor-grabbing shadow-lg group", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                    <div className="flex items-start md:items-center gap-4">
                      <div className={cn("transition-colors mt-1 md:mt-0", isDark ? "text-zinc-500 hover:text-cyan-400" : "text-slate-400 hover:text-cyan-600")}>
                        <GripVertical className="w-6 h-6" />
                      </div>
                      <div>
                        <div className={cn("inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border mb-2", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>{cert.date}</div>
                        <h4 className={cn("text-xl font-extrabold mb-1", isDark ? "text-white" : "text-slate-900")}>{cert.title}</h4>
                        <div className={cn("font-medium flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Award className="w-4 h-4" /> {cert.org}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end md:self-auto">
                      <button onClick={() => { setCertFormData(cert); setShowCertForm(true); }} className={cn("p-2.5 border rounded-xl transition-all shadow-inner", isDark ? "border-white/10 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10" : "border-slate-200 text-slate-500 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50")}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'certification', id: cert.id })} className={cn("p-2.5 border rounded-xl transition-all shadow-inner", isDark ? "border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10" : "border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </motion.div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteAction}
        title={`Delete Data?`}
        description={`This data will be permanently deleted.`}
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />
    </motion.div>
  );
}
