"use client";
import { useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Briefcase,
  GripVertical,
  Award,
  CheckCircle,
  Tag,
  FileText,
} from "lucide-react";
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
        fetch("/api/admin/resume/experience"),
        fetch("/api/admin/resume/education"),
        fetch("/api/admin/resume/certification"),
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

  const [activeTab, setActiveTab] = useUrlTab<"experience" | "education" | "certification">(
    "experience",
    { allowed: ["experience", "education", "certification"] as const }
  );

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

  const [expFormData, setExpFormData] = useState({
    id: null as number | null,
    year: "",
    role: "",
    company: "",
    type: "",
    description: "",
    tags: "",
  });

  const [eduFormData, setEduFormData] = useState({
    id: null as number | null,
    year: "",
    degree: "",
    school: "",
    type: "",
    description: "",
    tags: "",
  });

  const [certFormData, setCertFormData] = useState({
    id: null as number | null,
    title: "",
    org: "",
    date: "",
    icon: "",
    code: "",
    domain: "",
    description: "",
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "experience" | "education" | "certification";
    id: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const saveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = expFormData.id ? "PUT" : "POST";
      const url = expFormData.id
        ? `/api/admin/resume/experience/${expFormData.id}`
        : "/api/admin/resume/experience";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expFormData),
      });
      if (res.ok) {
        setShowExpForm(false);
        fetchData();
        toast.success(
          expFormData.id ? "Experience updated successfully!" : "Experience added successfully!"
        );
      } else {
        toast.error("Failed to save experience");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = eduFormData.id ? "PUT" : "POST";
      const url = eduFormData.id
        ? `/api/admin/resume/education/${eduFormData.id}`
        : "/api/admin/resume/education";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eduFormData),
      });
      if (res.ok) {
        setShowEduForm(false);
        fetchData();
        toast.success(
          eduFormData.id ? "Education updated successfully!" : "Education added successfully!"
        );
      } else {
        toast.error("Failed to save education");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = certFormData.id ? "PUT" : "POST";
      const url = certFormData.id
        ? `/api/admin/resume/certification/${certFormData.id}`
        : "/api/admin/resume/certification";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(certFormData),
      });
      if (res.ok) {
        setShowCertForm(false);
        fetchData();
        toast.success(
          certFormData.id
            ? "Certification updated successfully!"
            : "Certification added successfully!"
        );
      } else {
        toast.error("Failed to save certification");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "experience") {
        await fetch(`/api/admin/resume/experience/${deleteTarget.id}`, { method: "DELETE" });
      } else if (deleteTarget.type === "education") {
        await fetch(`/api/admin/resume/education/${deleteTarget.id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/admin/resume/certification/${deleteTarget.id}`, { method: "DELETE" });
      }
      fetchData();
      toast.success("Data deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete data");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReorder = async (
    type: "experience" | "education" | "certification",
    newOrder: any[]
  ) => {
    if (type === "experience") setExperiences(newOrder);
    else if (type === "education") setEducations(newOrder);
    else setCertifications(newOrder);

    const items = newOrder.map((item, index) => ({ id: item.id, order: index }));

    try {
      await fetch("/api/admin/resume/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, items }),
      });
    } catch (err) {
      console.error("Failed to save order");
    }
  };

  const inputClass = cn(
    "w-full border rounded-xl px-3.5 py-2 font-medium text-xs sm:text-sm outline-none focus:border-cyan-500 transition-all",
    isDark
      ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-500"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
  );

  const labelClass = cn(
    "block text-xs font-bold uppercase tracking-widest",
    isDark ? "text-zinc-400" : "text-slate-500"
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1
            className={cn(
              "text-xl sm:text-2xl font-bold mb-2 tracking-tight",
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            Resume Data
          </h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage your professional experience, education, and certifications stored in database.
          </p>
        </div>
      </div>

      {/* Tabs & Actions */}
      <div
        className={cn(
          "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4",
          isDark ? "border-white/10" : "border-slate-200"
        )}
      >
        <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-none scrollbar-hide w-full sm:w-auto pb-1">
          <button
            onClick={() => setActiveTab("experience")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap",
              activeTab === "experience"
                ? isDark
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-white text-cyan-700 border border-slate-200"
                : isDark
                  ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                  : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            )}
          >
            <Briefcase className="w-4 h-4 shrink-0" /> Experience
          </button>
          <button
            onClick={() => setActiveTab("education")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap",
              activeTab === "education"
                ? isDark
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-white text-cyan-700 border border-slate-200"
                : isDark
                  ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                  : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            )}
          >
            <BookOpen className="w-4 h-4 shrink-0" /> Education
          </button>
          <button
            onClick={() => setActiveTab("certification")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap",
              activeTab === "certification"
                ? isDark
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-white text-cyan-700 border border-slate-200"
                : isDark
                  ? "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                  : "bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            )}
          >
            <Award className="w-4 h-4 shrink-0" /> Certifications
          </button>
        </div>

        <div className="shrink-0 w-full sm:w-auto flex justify-end">
          {activeTab === "experience" && (
            <button
              onClick={() => {
                setExpFormData({
                  id: null,
                  year: "",
                  role: "",
                  company: "",
                  type: "Verified Role",
                  description: "",
                  tags: "",
                });
                setShowExpForm(true);
              }}
              className="font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Experience
            </button>
          )}
          {activeTab === "education" && (
            <button
              onClick={() => {
                setEduFormData({
                  id: null,
                  year: "",
                  degree: "",
                  school: "",
                  type: "Academic",
                  description: "",
                  tags: "",
                });
                setShowEduForm(true);
              }}
              className="font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Education
            </button>
          )}
          {activeTab === "certification" && (
            <button
              onClick={() => {
                setCertFormData({
                  id: null,
                  title: "",
                  org: "",
                  date: "",
                  icon: "",
                  code: "",
                  domain: "",
                  description: "",
                });
                setShowCertForm(true);
              }}
              className="font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Certification
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <AdminLoader className="min-h-[250px] py-12" />
      ) : (
        <div className="mt-6">
          {/* EXPERIENCE TAB */}
          {activeTab === "experience" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {showExpForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={cn(
                    "border rounded-2xl p-4 sm:p-5 mb-8 relative overflow-hidden",
                    isDark
                      ? "bg-[#0c0c0e] border-white/[0.08] shadow-md"
                      : "bg-white border-slate-200 shadow-sm"
                  )}
                  onSubmit={saveExperience}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-cyan-500"></div>
                  <h3
                    className={cn(
                      "text-sm sm:text-base font-bold mb-6 pb-4 border-b",
                      isDark ? "text-white border-white/[0.08]" : "text-slate-900 border-slate-200"
                    )}
                  >
                    {expFormData.id ? "Edit" : "Add"} Experience
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
                    <div className="space-y-2">
                      <label className={labelClass}>Year / Period *</label>
                      <input
                        required
                        value={expFormData.year}
                        onChange={(e) => setExpFormData({ ...expFormData, year: e.target.value })}
                        placeholder="e.g., 2022 - PRESENT"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Role / Title *</label>
                      <input
                        required
                        value={expFormData.role}
                        onChange={(e) => setExpFormData({ ...expFormData, role: e.target.value })}
                        placeholder="e.g., Cloud & DevOps Engineer"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Company / Organization *</label>
                      <input
                        required
                        value={expFormData.company}
                        onChange={(e) =>
                          setExpFormData({ ...expFormData, company: e.target.value })
                        }
                        placeholder="e.g., Masdika Cloud & Enterprise Clients"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Badge / Role Type</label>
                      <input
                        value={expFormData.type}
                        onChange={(e) => setExpFormData({ ...expFormData, type: e.target.value })}
                        placeholder="e.g., Independent Practice / Verified Role"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div className="space-y-2">
                      <label className={labelClass}>Description</label>
                      <textarea
                        rows={3}
                        value={expFormData.description}
                        onChange={(e) =>
                          setExpFormData({ ...expFormData, description: e.target.value })
                        }
                        placeholder="Describe responsibilities, infrastructure scope, and key achievements..."
                        className={cn(inputClass, "resize-y")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Skills / Tech Tags (Comma Separated)</label>
                      <textarea
                        rows={3}
                        value={expFormData.tags}
                        onChange={(e) => setExpFormData({ ...expFormData, tags: e.target.value })}
                        placeholder="e.g., Kubernetes & K3s, BGP & MikroTik, Cloud Architecture"
                        className={cn(inputClass, "resize-y font-mono")}
                      />
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex justify-end gap-3 pt-3 border-t mt-2",
                      isDark ? "border-white/[0.08]" : "border-slate-200"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setShowExpForm(false)}
                      className={cn(
                        "px-3.5 py-2 rounded-lg font-medium text-xs border transition-colors",
                        isDark
                          ? "border-white/[0.08] text-slate-300 hover:bg-slate-800"
                          : "border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3.5 py-2 rounded-lg font-semibold text-xs disabled:opacity-50 transition-all flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
                    >
                      {isSubmitting ? (
                        <div
                          className={cn(
                            "w-4 h-4 border-2 border-t-white rounded-full animate-spin",
                            isDark ? "border-white/30" : "border-slate-200"
                          )}
                        />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}{" "}
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </motion.form>
              )}

              <Reorder.Group
                axis="y"
                values={experiences}
                onReorder={(newOrder) => handleReorder("experience", newOrder)}
                className="space-y-4"
              >
                {experiences.map((exp) => {
                  const tagList = exp.tags
                    ? String(exp.tags)
                        .split(",")
                        .map((t: string) => t.trim())
                        .filter(Boolean)
                    : [];
                  return (
                    <Reorder.Item
                      key={exp.id}
                      value={exp}
                      className={cn(
                        "border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all cursor-grab active:cursor-grabbing group",
                        isDark
                          ? "bg-[#0c0c0e] border-white/[0.08] hover:border-slate-700 shadow-md"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                      )}
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            "transition-colors mt-1",
                            isDark
                              ? "text-zinc-500 hover:text-cyan-400"
                              : "text-slate-400 hover:text-cyan-600"
                          )}
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border",
                                isDark
                                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                                  : "bg-cyan-50 border-cyan-200 text-cyan-700"
                              )}
                            >
                              {exp.year}
                            </span>
                            {exp.type && (
                              <span
                                className={cn(
                                  "text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md border",
                                  isDark
                                    ? "bg-white/5 border-white/10 text-zinc-400"
                                    : "bg-slate-100 border-slate-200 text-slate-600"
                                )}
                              >
                                {exp.type}
                              </span>
                            )}
                          </div>
                          <h4
                            className={cn(
                              "text-sm sm:text-base font-bold mb-1",
                              isDark ? "text-white" : "text-slate-900"
                            )}
                          >
                            {exp.role}
                          </h4>
                          <div
                            className={cn(
                              "font-medium flex items-center gap-2 mb-2",
                              isDark ? "text-zinc-400" : "text-slate-500"
                            )}
                          >
                            <Briefcase className="w-3.5 h-3.5 text-cyan-400 shrink-0" />{" "}
                            <span>{exp.company}</span>
                          </div>
                          {exp.description && (
                            <p
                              className={cn(
                                "text-xs leading-relaxed mb-3",
                                isDark ? "text-zinc-400" : "text-slate-600"
                              )}
                            >
                              {exp.description}
                            </p>
                          )}
                          {tagList.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {tagList.map((tag: string) => (
                                <span
                                  key={tag}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[11px] font-mono border",
                                    isDark
                                      ? "bg-[#0a0a0c] border-white/10 text-zinc-400"
                                      : "bg-slate-50 border-slate-200 text-slate-600"
                                  )}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 self-end md:self-start shrink-0">
                        <button
                          onClick={() => {
                            setExpFormData({
                              id: exp.id,
                              year: exp.year || "",
                              role: exp.role || "",
                              company: exp.company || "",
                              type: exp.type || "",
                              description: exp.description || "",
                              tags: exp.tags || "",
                            });
                            setShowExpForm(true);
                          }}
                          className={cn(
                            "p-2.5 border rounded-xl transition-all",
                            isDark
                              ? "border-white/[0.08] text-zinc-400 hover:text-cyan-400 hover:border-slate-700 hover:bg-[#0a0a0c]"
                              : "border-slate-200 text-slate-500 hover:text-cyan-700 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: "experience", id: exp.id })}
                          className={cn(
                            "p-2.5 border rounded-xl transition-all",
                            isDark
                              ? "border-white/[0.08] text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
                              : "border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </motion.div>
          )}

          {/* EDUCATION TAB */}
          {activeTab === "education" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {showEduForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={cn(
                    "border rounded-2xl p-4 sm:p-5 mb-8 relative overflow-hidden",
                    isDark
                      ? "bg-[#0c0c0e] border-white/[0.08] shadow-md"
                      : "bg-white border-slate-200 shadow-sm"
                  )}
                  onSubmit={saveEducation}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-cyan-500"></div>
                  <h3
                    className={cn(
                      "text-sm sm:text-base font-bold mb-6 pb-4 border-b",
                      isDark ? "text-white border-white/[0.08]" : "text-slate-900 border-slate-200"
                    )}
                  >
                    {eduFormData.id ? "Edit" : "Add"} Education
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
                    <div className="space-y-2">
                      <label className={labelClass}>Year / Period *</label>
                      <input
                        required
                        value={eduFormData.year}
                        onChange={(e) => setEduFormData({ ...eduFormData, year: e.target.value })}
                        placeholder="e.g., 2023 - Present"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Degree / Track *</label>
                      <input
                        required
                        value={eduFormData.degree}
                        onChange={(e) =>
                          setEduFormData({ ...eduFormData, degree: e.target.value })
                        }
                        placeholder="e.g., UNIVERSITY"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>School / Institution *</label>
                      <input
                        required
                        value={eduFormData.school}
                        onChange={(e) =>
                          setEduFormData({ ...eduFormData, school: e.target.value })
                        }
                        placeholder="e.g., UNIVERSITAS TERBUKA"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Badge / Type</label>
                      <input
                        value={eduFormData.type}
                        onChange={(e) => setEduFormData({ ...eduFormData, type: e.target.value })}
                        placeholder="e.g., Academic / Vocational"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div className="space-y-2">
                      <label className={labelClass}>Description</label>
                      <textarea
                        rows={3}
                        value={eduFormData.description}
                        onChange={(e) =>
                          setEduFormData({ ...eduFormData, description: e.target.value })
                        }
                        placeholder="Describe coursework, technical focus, or specialization..."
                        className={cn(inputClass, "resize-y")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Focus Tags (Comma Separated)</label>
                      <textarea
                        rows={3}
                        value={eduFormData.tags}
                        onChange={(e) => setEduFormData({ ...eduFormData, tags: e.target.value })}
                        placeholder="e.g., Information Systems, Distributed Systems, Database Architecture"
                        className={cn(inputClass, "resize-y font-mono")}
                      />
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex justify-end gap-3 pt-3 border-t mt-2",
                      isDark ? "border-white/[0.08]" : "border-slate-200"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setShowEduForm(false)}
                      className={cn(
                        "px-3.5 py-2 rounded-lg font-medium text-xs border transition-colors",
                        isDark
                          ? "border-white/[0.08] text-slate-300 hover:bg-slate-800"
                          : "border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3.5 py-2 rounded-lg font-semibold text-xs disabled:opacity-50 transition-all flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
                    >
                      {isSubmitting ? (
                        <div
                          className={cn(
                            "w-4 h-4 border-2 border-t-white rounded-full animate-spin",
                            isDark ? "border-white/30" : "border-slate-200"
                          )}
                        />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}{" "}
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </motion.form>
              )}

              <Reorder.Group
                axis="y"
                values={educations}
                onReorder={(newOrder) => handleReorder("education", newOrder)}
                className="space-y-4"
              >
                {educations.map((edu) => {
                  const tagList = edu.tags
                    ? String(edu.tags)
                        .split(",")
                        .map((t: string) => t.trim())
                        .filter(Boolean)
                    : [];
                  return (
                    <Reorder.Item
                      key={edu.id}
                      value={edu}
                      className={cn(
                        "border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all cursor-grab active:cursor-grabbing group",
                        isDark
                          ? "bg-[#0c0c0e] border-white/[0.08] hover:border-slate-700 shadow-md"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                      )}
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            "transition-colors mt-1",
                            isDark
                              ? "text-zinc-500 hover:text-cyan-400"
                              : "text-slate-400 hover:text-cyan-600"
                          )}
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border",
                                isDark
                                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                                  : "bg-cyan-50 border-cyan-200 text-cyan-700"
                              )}
                            >
                              {edu.year}
                            </span>
                            {edu.type && (
                              <span
                                className={cn(
                                  "text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md border",
                                  isDark
                                    ? "bg-white/5 border-white/10 text-zinc-400"
                                    : "bg-slate-100 border-slate-200 text-slate-600"
                                )}
                              >
                                {edu.type}
                              </span>
                            )}
                          </div>
                          <h4
                            className={cn(
                              "text-sm sm:text-base font-bold mb-1",
                              isDark ? "text-white" : "text-slate-900"
                            )}
                          >
                            {edu.degree}
                          </h4>
                          <div
                            className={cn(
                              "font-medium flex items-center gap-2 mb-2",
                              isDark ? "text-zinc-400" : "text-slate-500"
                            )}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />{" "}
                            <span>{edu.school}</span>
                          </div>
                          {edu.description && (
                            <p
                              className={cn(
                                "text-xs leading-relaxed mb-3",
                                isDark ? "text-zinc-400" : "text-slate-600"
                              )}
                            >
                              {edu.description}
                            </p>
                          )}
                          {tagList.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {tagList.map((tag: string) => (
                                <span
                                  key={tag}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[11px] font-mono border",
                                    isDark
                                      ? "bg-[#0a0a0c] border-white/10 text-zinc-400"
                                      : "bg-slate-50 border-slate-200 text-slate-600"
                                  )}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 self-end md:self-start shrink-0">
                        <button
                          onClick={() => {
                            setEduFormData({
                              id: edu.id,
                              year: edu.year || "",
                              degree: edu.degree || "",
                              school: edu.school || "",
                              type: edu.type || "",
                              description: edu.description || "",
                              tags: edu.tags || "",
                            });
                            setShowEduForm(true);
                          }}
                          className={cn(
                            "p-2.5 border rounded-xl transition-all",
                            isDark
                              ? "border-white/[0.08] text-zinc-400 hover:text-cyan-400 hover:border-slate-700 hover:bg-[#0a0a0c]"
                              : "border-slate-200 text-slate-500 hover:text-cyan-700 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: "education", id: edu.id })}
                          className={cn(
                            "p-2.5 border rounded-xl transition-all",
                            isDark
                              ? "border-white/[0.08] text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
                              : "border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </motion.div>
          )}

          {/* CERTIFICATION TAB */}
          {activeTab === "certification" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {showCertForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={cn(
                    "border rounded-2xl p-4 sm:p-5 mb-8 relative overflow-hidden",
                    isDark
                      ? "bg-[#0c0c0e] border-white/[0.08] shadow-md"
                      : "bg-white border-slate-200 shadow-sm"
                  )}
                  onSubmit={saveCertification}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-cyan-500"></div>
                  <h3
                    className={cn(
                      "text-sm sm:text-base font-bold mb-6 pb-4 border-b",
                      isDark ? "text-white border-white/[0.08]" : "text-slate-900 border-slate-200"
                    )}
                  >
                    {certFormData.id ? "Edit" : "Add"} Certification
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                    <div className="space-y-2">
                      <label className={labelClass}>Title *</label>
                      <input
                        required
                        value={certFormData.title}
                        onChange={(e) =>
                          setCertFormData({ ...certFormData, title: e.target.value })
                        }
                        placeholder="e.g., AWS Certified Solutions Architect"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Organization *</label>
                      <input
                        required
                        value={certFormData.org}
                        onChange={(e) => setCertFormData({ ...certFormData, org: e.target.value })}
                        placeholder="e.g., Amazon Web Services"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Date / Year *</label>
                      <input
                        required
                        value={certFormData.date}
                        onChange={(e) =>
                          setCertFormData({ ...certFormData, date: e.target.value })
                        }
                        placeholder="e.g., 2024"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                    <div className="space-y-2">
                      <label className={labelClass}>Domain Category</label>
                      <input
                        value={certFormData.domain}
                        onChange={(e) =>
                          setCertFormData({ ...certFormData, domain: e.target.value })
                        }
                        placeholder="e.g., Cloud Architecture"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Credential Code</label>
                      <input
                        value={certFormData.code}
                        onChange={(e) =>
                          setCertFormData({ ...certFormData, code: e.target.value })
                        }
                        placeholder="e.g., AWS-SAA / CNCF-CKA"
                        className={cn(inputClass, "font-mono")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>Fallback Icon Name (Lucide)</label>
                      <input
                        value={certFormData.icon}
                        onChange={(e) =>
                          setCertFormData({ ...certFormData, icon: e.target.value })
                        }
                        placeholder="e.g., Award, Shield, CheckCircle"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <label className={labelClass}>Technical Scope / Description</label>
                    <textarea
                      rows={3}
                      value={certFormData.description}
                      onChange={(e) =>
                        setCertFormData({ ...certFormData, description: e.target.value })
                      }
                      placeholder="Describe the technical competencies validated by this certification..."
                      className={cn(inputClass, "resize-y")}
                    />
                  </div>

                  <div
                    className={cn(
                      "flex justify-end gap-3 pt-3 border-t mt-2",
                      isDark ? "border-white/[0.08]" : "border-slate-200"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setShowCertForm(false)}
                      className={cn(
                        "px-3.5 py-2 rounded-lg font-medium text-xs border transition-colors",
                        isDark
                          ? "border-white/[0.08] text-slate-300 hover:bg-slate-800"
                          : "border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3.5 py-2 rounded-lg font-semibold text-xs disabled:opacity-50 transition-all flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
                    >
                      {isSubmitting ? (
                        <div
                          className={cn(
                            "w-4 h-4 border-2 border-t-white rounded-full animate-spin",
                            isDark ? "border-white/30" : "border-slate-200"
                          )}
                        />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}{" "}
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </motion.form>
              )}

              <Reorder.Group
                axis="y"
                values={certifications}
                onReorder={(newOrder) => handleReorder("certification", newOrder)}
                className="space-y-4"
              >
                {certifications.map((cert) => (
                  <Reorder.Item
                    key={cert.id}
                    value={cert}
                    className={cn(
                      "border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all cursor-grab active:cursor-grabbing group",
                      isDark
                        ? "bg-[#0c0c0e] border-white/[0.08] hover:border-slate-700 shadow-md"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    )}
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className={cn(
                          "transition-colors mt-1",
                          isDark
                            ? "text-zinc-500 hover:text-cyan-400"
                            : "text-slate-400 hover:text-cyan-600"
                        )}
                      >
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border",
                              isDark
                                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                                : "bg-cyan-50 border-cyan-200 text-cyan-700"
                            )}
                          >
                            {cert.date}
                          </span>
                          {cert.domain && (
                            <span
                              className={cn(
                                "text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md border",
                                isDark
                                  ? "bg-white/5 border-white/10 text-zinc-400"
                                  : "bg-slate-100 border-slate-200 text-slate-600"
                              )}
                            >
                              {cert.domain}
                            </span>
                          )}
                          {cert.code && (
                            <span
                              className={cn(
                                "text-[11px] font-mono px-2 py-0.5 rounded-md border",
                                isDark
                                  ? "bg-[#0a0a0c] border-white/10 text-cyan-400"
                                  : "bg-slate-50 border-slate-200 text-cyan-700"
                              )}
                            >
                              {cert.code}
                            </span>
                          )}
                        </div>
                        <h4
                          className={cn(
                            "text-sm sm:text-base font-bold mb-1",
                            isDark ? "text-white" : "text-slate-900"
                          )}
                        >
                          {cert.title}
                        </h4>
                        <div
                          className={cn(
                            "font-medium flex items-center gap-2 mb-2",
                            isDark ? "text-zinc-400" : "text-slate-500"
                          )}
                        >
                          <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" />{" "}
                          <span>{cert.org}</span>
                        </div>
                        {cert.description && (
                          <p
                            className={cn(
                              "text-xs leading-relaxed",
                              isDark ? "text-zinc-400" : "text-slate-600"
                            )}
                          >
                            {cert.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 self-end md:self-start shrink-0">
                      <button
                        onClick={() => {
                          setCertFormData({
                            id: cert.id,
                            title: cert.title || "",
                            org: cert.org || "",
                            date: cert.date || "",
                            icon: cert.icon || "",
                            code: cert.code || "",
                            domain: cert.domain || "",
                            description: cert.description || "",
                          });
                          setShowCertForm(true);
                        }}
                        className={cn(
                          "p-2.5 border rounded-xl transition-all",
                          isDark
                            ? "border-white/[0.08] text-zinc-400 hover:text-cyan-400 hover:border-slate-700 hover:bg-[#0a0a0c]"
                            : "border-slate-200 text-slate-500 hover:text-cyan-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: "certification", id: cert.id })}
                        className={cn(
                          "p-2.5 border rounded-xl transition-all",
                          isDark
                            ? "border-white/[0.08] text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
                            : "border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
