"use client";
import { cn } from "@/lib/utils";
import { AdminLoader } from "@/components/admin/AdminLoader";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Image as ImageIcon, Loader2, ChevronDown , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { motion } from "framer-motion";

export default function EditPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === 'new';
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    categoryName: "Uncategorized",
    techStack: "",
    status: "COMPLETED",
    image: "",
    projectUrl: "",
    client: "",
    timeline: "",
    role: "",
    challenge: "",
    solution: "",
    testimonial: "",
    testimonialAuthor: "",
    keyResults: ""
  });

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/admin/portfolio/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            toast.error(data.error);
            router.push('/admin/portfolio');
            return;
          }
          setFormData({
            title: data.title || "",
            description: data.description || "",
            content: data.content || "",
            categoryName: data.category?.name || "Uncategorized",
            techStack: data.techStack || "",
            status: data.status || "COMPLETED",
            image: data.image || "",
            projectUrl: data.projectUrl || "",
            client: data.client || "",
            timeline: data.timeline || "",
            role: data.role || "",
            challenge: data.challenge || "",
            solution: data.solution || "",
            testimonial: data.testimonial || "",
            testimonialAuthor: data.testimonialAuthor || "",
            keyResults: data.keyResults || ""
          });
          setLoading(false);
        })
        .catch(err => {
          toast.error("Failed to load project");
          setLoading(false);
        });
    }
  }, [id, isNew, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Title and Description are required");
      return;
    }
    
    setSaving(true);
    try {
      const url = isNew ? '/api/admin/portfolio' : `/api/admin/portfolio/${id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success(isNew ? "Project created successfully!" : "Project updated successfully!");
        router.push('/admin/portfolio');
        router.refresh();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to save project");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoader />;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/portfolio" className={cn("p-2.5 rounded-xl transition-all shadow-sm border shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>{isNew ? 'Add New Project' : 'Edit Project'}</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Showcase your best work in the portfolio.</p>
        </div>
      </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cn("glass-card rounded-2xl p-6 md:p-8 space-y-6 border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Project Title</label>
          <input 
            type="text" 
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Enterprise Kubernetes Cluster" 
            className={cn("w-full px-5 py-3.5 border rounded-xl text-lg font-bold focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500 placeholder:font-medium", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Category</label>
            <input 
              type="text" 
              name="categoryName"
              value={formData.categoryName}
              onChange={handleChange}
              placeholder="e.g. Cloud Infrastructure" 
              className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
            />
          </div>
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Status</label>
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner flex justify-between items-center", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
              >
                <span>{formData.status === 'COMPLETED' ? 'Completed' : formData.status === 'IN_PROGRESS' ? 'In Progress' : 'Planned'}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isStatusOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsStatusOpen(false)} />
                  <div className={cn("absolute top-full left-0 w-full mt-2 bg-[#0b1121] border rounded-xl shadow-xl overflow-hidden z-50", isDark ? "border-white/10" : "border-slate-200")}>
                    {['COMPLETED', 'IN_PROGRESS', 'PLANNED'].map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, status }));
                          setIsStatusOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 text-sm font-medium transition-colors ${
                          formData.status === status 
                            ? 'bg-cyan-500/10 text-cyan-400' 
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {status === 'COMPLETED' ? 'Completed' : status === 'IN_PROGRESS' ? 'In Progress' : 'Planned'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Tech Stack (comma separated)</label>
          <input 
            type="text" 
            name="techStack"
            value={formData.techStack}
            onChange={handleChange}
            placeholder="e.g. Next.js, Prisma, TailwindCSS" 
            className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
          />
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><ImageIcon className="w-4 h-4" /> Project Image</label>
          <div className="flex gap-3">
            <input 
              type="text" 
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://... or click Select Image" 
              className={cn("flex-1 px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
            />
            <button
              type="button"
              onClick={() => setIsMediaLibraryOpen(true)}
              className={cn("px-5 py-3.5 hover:bg-white/10 border rounded-xl text-sm font-bold transition-all shadow-inner whitespace-nowrap", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
            >
              Select Image
            </button>
          </div>
          {formData.image && (
            <div className={cn("mt-4 aspect-video w-full max-w-md rounded-2xl overflow-hidden border shadow-inner group", isDark ? "border-white/10" : "border-slate-200")}>
               <img referrerPolicy="no-referrer" src={formData.image} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Project URL (Live Demo / External Link)</label>
          <input 
            type="url" 
            name="projectUrl"
            value={formData.projectUrl}
            onChange={handleChange}
            placeholder="https://example.com/project" 
            className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
          />
          <p className="text-xs font-medium text-zinc-500">Optional. If filled, a "View Project" button will appear on the portfolio page.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Client</label>
            <input 
              type="text" 
              name="client"
              value={formData.client}
              onChange={handleChange}
              placeholder="e.g. FinTech Global Inc." 
              className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
            />
          </div>
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Timeline</label>
            <input 
              type="text" 
              name="timeline"
              value={formData.timeline}
              onChange={handleChange}
              placeholder="e.g. 4 Months" 
              className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
            />
          </div>
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Role</label>
            <input 
              type="text" 
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="e.g. Lead Cloud Architect" 
              className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Short Description</label>
          <textarea 
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            placeholder="A brief summary of the project..." 
            className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all resize-none shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
          />
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Project Overview</label>
          <textarea 
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={4}
            placeholder="Detailed explanation of the project overview..." 
            className={cn("w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all resize-y font-mono text-sm shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
          />
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>The Challenge</label>
          <textarea 
            name="challenge"
            value={formData.challenge}
            onChange={handleChange}
            rows={4}
            placeholder="What challenges did the client face?" 
            className={cn("w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all resize-y font-mono text-sm shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
          />
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>The Solution</label>
          <textarea 
            name="solution"
            value={formData.solution}
            onChange={handleChange}
            rows={4}
            placeholder="How did you solve the problem?" 
            className={cn("w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all resize-y font-mono text-sm shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Testimonial Quote</label>
            <textarea 
              name="testimonial"
              value={formData.testimonial}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. The migration transformed our culture..." 
              className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all resize-y shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
            />
          </div>
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Testimonial Author</label>
            <input 
              type="text" 
              name="testimonialAuthor"
              value={formData.testimonialAuthor}
              onChange={handleChange}
              placeholder="e.g. CTO, FinTech Global Inc." 
              className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Key Results (Format: Title|Description per line)</label>
          <textarea 
            name="keyResults"
            value={formData.keyResults}
            onChange={handleChange}
            rows={5}
            placeholder="99.99% Uptime|Achieved high availability across multi-AZ deployments.&#10;80% Faster Deployments|Reduced deployment time from weeks to hours." 
            className={cn("w-full px-5 py-3.5 border rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all resize-y font-mono text-sm shadow-inner placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
          />
          <p className="text-xs font-medium text-zinc-500">Separate title and description with <code className={cn("bg-white/10 px-1 rounded font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>|</code> character, press Enter for new result.</p>
        </div>

        <div className="pt-8 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className={cn("flex items-center justify-center gap-2 px-8 py-4  font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:opacity-50 w-full md:w-auto", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}
          >
            <Save className="w-5 h-5" /> {saving ? "Saving..." : "Save Project"}
          </button>
        </div>
      </motion.div>
      <MediaLibrary 
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={(url) => {
          setFormData(prev => ({ ...prev, image: url }));
        }}
        title="Select Project Image"
      />
    </motion.div>
  );
}
