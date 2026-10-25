"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Save,
  Paperclip,
  PenTool,
  MessageSquare,
  Users,
  Plus,
  Maximize2,
  Minimize2,
  Code2,
  Eye,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  Search,
  Check,
  Smartphone,
  Monitor,
  Sparkles,
  Mail,
  FileText
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

// Pre-designed Responsive Promotional Email Templates
const PROMO_TEMPLATES = [
  {
    id: "vps_sale",
    name: "⚡ VPS Cloud Flash Sale (50% OFF)",
    subject: "⚡ Flash Sale: Get 50% OFF on all High-Performance Cloud VPS!",
    html: `<div style="background-color: #f1f5f9; padding: 40px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #0891b2 50%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
      <span style="background: rgba(255, 255, 255, 0.15); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; display: inline-block; margin-bottom: 12px;">Limited Time Offer</span>
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">MASDIKA CLOUD VPS</h1>
      <p style="color: #e0f2fe; margin: 8px 0 0; font-size: 15px; font-weight: 500;">High-Performance Cloud Infrastructure for Developers</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 35px 30px;">
      <p style="font-size: 16px; color: #334155; margin-top: 0;">Hi <strong>{name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        We're thrilled to announce an exclusive limited-time promotion on our Enterprise Proxmox Cloud VPS. Upgrade your servers today and experience blazing-fast NVMe storage, dedicated vCPU performance, and flexible bandwidth speed tiers up to 1000 Mbps!
      </p>

      <!-- Promo Box -->
      <div style="background: #f8fafc; border: 2px dashed #06b6d4; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
        <span style="font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Use Coupon Code at Checkout</span>
        <div style="font-size: 26px; font-weight: 900; color: #0891b2; font-family: monospace; letter-spacing: 2px;">FLASH50CLOUD</div>
        <p style="font-size: 13px; color: #10b981; font-weight: 700; margin: 8px 0 0;">✓ Valid for the first 50 orders this month</p>
      </div>

      <!-- Feature Highlights -->
      <div style="margin: 28px 0;">
        <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 14px;">Included with every Cloud VPS:</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #475569;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">🚀 <strong>Ultra-Low Latency:</strong> Direct Indonesia IDC Tier-3 datacenter connection</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">⚡ <strong>Bandwidth Upgrades:</strong> Configurable speed tiers up to 1000 Mbps</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">🛡️ <strong>Automated Protection:</strong> Enterprise Proxmox firewall & hardware isolation</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">🔄 <strong>Instant Delivery:</strong> Fully online in less than 60 seconds with Cloud-Init</td>
          </tr>
        </table>
      </div>

      <!-- Call to Action Button -->
      <div style="text-align: center; margin: 35px 0 15px;">
        <a href="https://masdika.id/vps" style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);">
          Deploy VPS Now with 50% OFF →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
      <p style="margin: 0 0 4px;">You received this email because you are a registered customer at Masdika Cloud.</p>
      <p style="margin: 0;">© {year} PT Masdika Teknologi Indonesia. All rights reserved.</p>
    </div>
  </div>
</div>`
  },
  {
    id: "speed_upgrade",
    name: "🚀 Bandwidth Speed Tiers Available",
    subject: "🚀 Boost Your VPS: New Network Bandwidth Speed Options up to 1000 Mbps!",
    html: `<div style="background-color: #f1f5f9; padding: 40px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); padding: 35px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900;">NEW FEATURE RELEASE</h1>
      <p style="color: #e0f2fe; margin: 6px 0 0; font-size: 14px;">Dynamic Bandwidth Port Speed Limits</p>
    </div>
    <div style="padding: 35px 30px;">
      <p style="font-size: 16px; color: #334155; margin-top: 0;">Hello <strong>{name}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        We have officially upgraded our network infrastructure! You can now customize your VPS port speed limits with fine-grained tiers from <strong>100 Mbps (Free Base)</strong> all the way up to <strong>1000 Mbps Gigabit</strong> directly from your client control panel.
      </p>
      <div style="text-align: center; margin: 30px 0 10px;">
        <a href="https://masdika.id/dashboard/vps" style="background-color: #06b6d4; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
          Configure My VPS Speed →
        </a>
      </div>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
      © {year} PT Masdika Teknologi Indonesia. All rights reserved.
    </div>
  </div>
</div>`
  },
  {
    id: "maintenance",
    name: "🛠️ Scheduled System Maintenance Notice",
    subject: "🛠️ Notice: Scheduled Infrastructure Maintenance Window",
    html: `<div style="background-color: #f1f5f9; padding: 40px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <div style="background: #0f172a; padding: 35px 30px; text-align: center; border-bottom: 3px solid #f59e0b;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">SCHEDULED MAINTENANCE</h1>
      <p style="color: #fbbf24; margin: 6px 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">Infrastructure Hardware Upgrade</p>
    </div>
    <div style="padding: 35px 30px;">
      <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear <strong>{name}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">
        To ensure optimal stability, throughput, and security, our engineering team will be performing scheduled network and hypervisor maintenance.
      </p>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #92400e;"><strong>Maintenance Window:</strong> Sunday, 01:00 AM – 04:00 AM (WIB)</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #92400e;"><strong>Expected Impact:</strong> Brief latency spikes or momentary disconnection under 5 minutes.</p>
        <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Scope:</strong> Core Proxmox hypervisor nodes & upstream routers.</p>
      </div>
      <p style="font-size: 14px; color: #475569;">If you experience any issues after this maintenance period, please open a ticket with our 24/7 support desk.</p>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
      © {year} PT Masdika Teknologi Indonesia. All rights reserved.
    </div>
  </div>
</div>`
  },
  {
    id: "blank",
    name: "📄 Blank Clean Canvas",
    subject: "",
    html: `<div style="background-color: #f8fafc; padding: 30px 15px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0891b2; margin-top: 0;">Hello {name},</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Write your promotional email announcement here...</p>
    <div style="margin: 30px 0;">
      <a href="https://masdika.id" style="background-color: #06b6d4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Learn More</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 15px;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">© {year} PT Masdika Teknologi Indonesia. All rights reserved.</p>
  </div>
</div>`
  }
];

export default function EmailBlastPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const searchParams = useSearchParams();

  // Form Fields
  const [senderName, setSenderName] = useState("Masdika.ID");
  const [senderEmail, setSenderEmail] = useState("me@masdika.id");
  const [isEditingSender, setIsEditingSender] = useState(false);
  const [targetType, setTargetType] = useState<"all" | "vps" | "selected" | "custom">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [customEmails, setCustomEmails] = useState("");
  const [subject, setSubject] = useState(PROMO_TEMPLATES[0].subject);
  const [htmlContent, setHtmlContent] = useState(PROMO_TEMPLATES[0].html);

  // Editor Mode (Visual vs HTML Source)
  const [sourceMode, setSourceMode] = useState(false);

  // Recipients Data
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [recipientsData, setRecipientsData] = useState<{
    totalCustomers: number;
    vpsCustomers: number;
    customers: any[];
  }>({
    totalCustomers: 0,
    vpsCustomers: 0,
    customers: []
  });

  // UI Modals
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);

  // Fetch recipients on mount
  useEffect(() => {
    fetchRecipients();
  }, []);

  // Pre-select customer if userId query param is provided
  useEffect(() => {
    const userIdParam = searchParams.get("userId");
    if (userIdParam) {
      const id = parseInt(userIdParam);
      if (!isNaN(id)) {
        setTargetType("selected");
        setSelectedUserIds([id]);
      }
    }
  }, [searchParams]);

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch("/api/admin/email-blast/recipients");
      const data = await res.json();
      if (res.ok && data.success) {
        setRecipientsData(data.data);
      }
    } catch (err) {
      console.error("Failed to load recipients:", err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  // Recipient Count Calculation
  const getRecipientCount = () => {
    if (targetType === "all") return recipientsData.totalCustomers;
    if (targetType === "vps") return recipientsData.vpsCustomers;
    if (targetType === "selected") return selectedUserIds.length;
    if (targetType === "custom") {
      const valid = customEmails
        .split(/[\n,;]+/)
        .map(e => e.trim())
        .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      return Array.from(new Set(valid)).length;
    }
    return 0;
  };

  // Template switch
  const handleSelectTemplate = (template: typeof PROMO_TEMPLATES[0]) => {
    setSubject(template.subject);
    setHtmlContent(template.html);
    setShowTemplatesDropdown(false);
    toast.success(`Loaded "${template.name}" template`);
  };

  // Formatting actions for Visual mode
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  // Handle Send Test Email
  const handleSendTest = async () => {
    if (!testEmailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailAddress)) {
      toast.error("Please enter a valid recipient email address for testing");
      return;
    }

    setSendingTest(true);
    const toastId = toast.loading(`Sending test email to ${testEmailAddress}...`);

    try {
      const res = await fetch("/api/admin/email-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isTest: true,
          testEmail: testEmailAddress,
          subject,
          htmlContent,
          senderName,
          senderEmail
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Test email sent successfully!", { id: toastId });
        setShowTestModal(false);
      } else {
        toast.error(data.error || "Failed to send test email", { id: toastId });
      }
    } catch {
      toast.error("Failed to connect to email server", { id: toastId });
    } finally {
      setSendingTest(false);
    }
  };

  // Handle Send Campaign Blast
  const handleSendBlast = async () => {
    const count = getRecipientCount();
    if (count === 0) {
      toast.error("No recipients selected for this email blast");
      return;
    }

    setSendingBlast(true);
    const toastId = toast.loading(`Dispatching promotional email to ${count} recipients...`);

    try {
      const res = await fetch("/api/admin/email-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          selectedUserIds,
          customEmails,
          subject,
          htmlContent,
          senderName,
          senderEmail
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Blast completed: ${data.sentCount} sent!`, { id: toastId });
        setShowSendConfirmModal(false);
      } else {
        toast.error(data.error || "Failed to complete email blast", { id: toastId });
      }
    } catch {
      toast.error("Failed to connect to email server", { id: toastId });
    } finally {
      setSendingBlast(false);
    }
  };

  // Filtered customers for recipient modal
  const filteredCustomers = recipientsData.customers.filter(c =>
    (c.name || "").toLowerCase().includes(recipientSearch.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(recipientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <Mail className={cn("w-6 h-6", isDark ? "text-cyan-400" : "text-cyan-700")} />
            Email Blast & Customer Promotions
          </h1>
          <p className={cn("text-xs sm:text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Compose and broadcast high-converting HTML promotional campaigns directly to your customers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs",
              isDark ? "bg-[#0b1322] border-slate-700 text-zinc-300 hover:text-white hover:bg-white/5" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            )}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-500" />
            <span>Preview Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs",
              isDark ? "bg-[#0b1322] border-slate-700 text-cyan-300 hover:border-cyan-500 hover:bg-cyan-500/10" : "bg-white border-slate-300 text-cyan-800 hover:border-cyan-600 hover:bg-cyan-50"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Send Test Email</span>
          </button>
        </div>
      </div>

      {/* Roundcube Main Window Container matching Image 4 */}
      <div className={cn("rounded-2xl border overflow-hidden shadow-xl", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-300")}>
        
        {/* Roundcube Action Bar Header matching Image 4 top icons */}
        <div className={cn("px-4 py-2.5 border-b flex items-center justify-between gap-4", isDark ? "bg-[#0c1626] border-slate-800" : "bg-[#1e293b] text-white border-slate-700")}>
          <div className="flex items-center gap-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => toast.success("Draft automatically saved to local session")}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span className="text-[10px]">Save</span>
            </button>
            <button
              type="button"
              onClick={() => toast.info("Attachments are embedded directly via images or URLs in HTML.")}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-[10px]">Attach</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const sig = `<br/><br/>--<br/><strong>Masdika Cloud Team</strong><br/>Website: <a href="https://masdika.id">masdika.id</a><br/>Support: support@masdika.id`;
                setHtmlContent(prev => prev + sig);
                toast.success("Signature appended to email");
              }}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <PenTool className="w-4 h-4" />
              <span className="text-[10px]">Signature</span>
            </button>

            {/* Templates / Responses Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplatesDropdown(prev => !prev)}
                className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px]">Responses</span>
              </button>

              {showTemplatesDropdown && (
                <div className={cn("absolute left-0 top-full mt-2 w-72 rounded-xl border shadow-2xl z-30 p-1.5 space-y-1 animate-in fade-in duration-150", isDark ? "bg-[#0b1322] border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800")}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-white/5">
                    Choose Promotional Template
                  </div>
                  {PROMO_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                        isDark ? "hover:bg-cyan-500/10 hover:text-cyan-300 text-zinc-300" : "hover:bg-cyan-50 hover:text-cyan-800 text-slate-700"
                      )}
                    >
                      <span className="truncate">{tpl.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-bold", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" : "bg-cyan-500/20 text-cyan-300 border-cyan-400/30")}>
              <Users className="w-3 h-3" />
              {getRecipientCount()} Recipient(s)
            </span>
          </div>
        </div>

        {/* Roundcube Fields: From, To, Subject */}
        <div className={cn("divide-y border-b text-xs sm:text-sm", isDark ? "divide-slate-800 bg-[#060b14]" : "divide-slate-200 bg-slate-50/70")}>
          
          {/* FROM ROW */}
          <div className="flex items-center px-4 py-2.5 gap-3">
            <span className={cn("w-16 sm:w-20 font-semibold shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>From</span>
            <div className="flex-1 flex items-center gap-2">
              {isEditingSender ? (
                <div className="flex items-center gap-2 w-full max-w-md">
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Sender Name"
                    className={cn("px-2.5 py-1 rounded border text-xs outline-none flex-1", isDark ? "bg-[#0b1322] border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800")}
                  />
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="me@masdika.id"
                    className={cn("px-2.5 py-1 rounded border text-xs outline-none flex-1 font-mono", isDark ? "bg-[#0b1322] border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800")}
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingSender(false)}
                    className="p-1 text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>"{senderName}" &lt;{senderEmail}&gt;</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingSender(true)}
                    title="Edit Sender Identity"
                    className="p-1 rounded text-zinc-500 hover:text-cyan-400 transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TO ROW */}
          <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 gap-2 sm:gap-3">
            <span className={cn("w-16 sm:w-20 font-semibold shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>To</span>
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {/* Target Type Selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                    targetType === "all"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs"
                      : isDark ? "bg-[#0b1322] border-slate-700 text-zinc-400 hover:text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  All Customers ({recipientsData.totalCustomers})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("vps")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                    targetType === "vps"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs"
                      : isDark ? "bg-[#0b1322] border-slate-700 text-zinc-400 hover:text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Active VPS Clients ({recipientsData.vpsCustomers})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("selected");
                    setShowRecipientModal(true);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1",
                    targetType === "selected"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs"
                      : isDark ? "bg-[#0b1322] border-slate-700 text-zinc-400 hover:text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <span>Select Clients ({selectedUserIds.length})</span>
                  <Users className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("custom")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                    targetType === "custom"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs"
                      : isDark ? "bg-[#0b1322] border-slate-700 text-zinc-400 hover:text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Custom Email List
                </button>
              </div>

              {/* Custom Email Input */}
              {targetType === "custom" && (
                <div className="w-full mt-2">
                  <textarea
                    rows={2}
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                    placeholder="Enter recipient emails separated by comma or newlines (e.g. client1@domain.com, client2@domain.com)..."
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-mono outline-none transition-colors",
                      isDark ? "bg-[#0b1322] border-slate-700 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
              )}
            </div>

            {/* Contact modal trigger matching Image 4 icon */}
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowRecipientModal(true)}
                title="Select Customers from Directory"
                className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400" : "border-slate-300 hover:border-cyan-500 hover:bg-cyan-50 text-cyan-700")}
              >
                <Users className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SUBJECT ROW */}
          <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2.5 gap-2 sm:gap-3">
            <span className={cn("w-16 sm:w-20 font-semibold shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>Subject</span>
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject line..."
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-xl border text-sm font-medium outline-none transition-all",
                  isDark
                    ? "bg-[#0b1322] border-slate-700 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                    : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/20"
                )}
              />
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 shrink-0">
                <span>Tags:</span>
                <button
                  type="button"
                  onClick={() => setSubject(prev => prev + " {name}")}
                  className="px-1.5 py-0.5 rounded border border-dashed border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
                >
                  +{`{name}`}
                </button>
                <button
                  type="button"
                  onClick={() => setSubject(prev => prev + " {year}")}
                  className="px-1.5 py-0.5 rounded border border-dashed border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
                >
                  +{`{year}`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Roundcube Rich Toolbar matching Image 4 */}
        <div className={cn("px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 select-none", isDark ? "bg-[#0e1828] border-slate-800" : "bg-[#f1f5f9] border-slate-200")}>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {/* Clear Format */}
            <button
              type="button"
              onClick={() => applyFormat("removeFormat")}
              title="Clear formatting"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-slate-700 mx-1" />

            {/* Bold, Italic, Underline, Strike */}
            <button
              type="button"
              onClick={() => applyFormat("bold")}
              title="Bold (Ctrl+B)"
              className="px-2 py-1 rounded font-bold hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyFormat("italic")}
              title="Italic (Ctrl+I)"
              className="px-2 py-1 rounded italic hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => applyFormat("underline")}
              title="Underline (Ctrl+U)"
              className="px-2 py-1 rounded underline hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              U
            </button>

            <span className="w-px h-4 bg-slate-700 mx-1" />

            {/* Alignments */}
            <button
              type="button"
              onClick={() => applyFormat("justifyLeft")}
              title="Align Left"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              ≡
            </button>
            <button
              type="button"
              onClick={() => applyFormat("justifyCenter")}
              title="Align Center"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              ☷
            </button>
            <button
              type="button"
              onClick={() => applyFormat("justifyRight")}
              title="Align Right"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              ☵
            </button>

            <span className="w-px h-4 bg-slate-700 mx-1" />

            {/* Font Family Dropdown */}
            <select
              title="Font Family"
              onChange={(e) => applyFormat("fontName", e.target.value)}
              className={cn("px-2 py-1 rounded text-xs outline-none border cursor-pointer", isDark ? "bg-[#0b1322] border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800")}
            >
              <option value="Verdana">Verdana</option>
              <option value="Arial">Arial</option>
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Georgia">Georgia</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Courier New">Courier New</option>
            </select>

            {/* Font Size Dropdown */}
            <select
              title="Font Size"
              onChange={(e) => applyFormat("fontSize", e.target.value)}
              className={cn("px-2 py-1 rounded text-xs outline-none border cursor-pointer", isDark ? "bg-[#0b1322] border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800")}
            >
              <option value="2">10pt</option>
              <option value="3">12pt</option>
              <option value="4">14pt</option>
              <option value="5">18pt</option>
              <option value="6">24pt</option>
              <option value="7">36pt</option>
            </select>

            <span className="w-px h-4 bg-slate-700 mx-1" />

            {/* Color pickers */}
            <label className="flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-white/10" title="Text Color">
              <span className="font-bold underline decoration-cyan-400">A</span>
              <input
                type="color"
                className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer opacity-0 absolute"
                onChange={(e) => applyFormat("foreColor", e.target.value)}
              />
            </label>

            {/* Lists & Indents */}
            <button
              type="button"
              onClick={() => applyFormat("insertUnorderedList")}
              title="Bullet List"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              •≡
            </button>
            <button
              type="button"
              onClick={() => applyFormat("insertOrderedList")}
              title="Numbered List"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              1.≡
            </button>

            {/* Link & Table */}
            <button
              type="button"
              onClick={() => {
                const url = prompt("Enter hyperlink URL (e.g. https://masdika.id):");
                if (url) applyFormat("createLink", url);
              }}
              title="Insert Link"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              🔗
            </button>
            <button
              type="button"
              onClick={() => applyFormat("unlink")}
              title="Remove Link"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer"
            >
              ⛓✕
            </button>
          </div>

          {/* Right Mode Switch: HTML Source Code vs Visual Preview */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSourceMode(prev => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-xs",
                sourceMode
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : isDark ? "bg-[#0b1322] border-slate-700 text-cyan-400 hover:bg-white/5" : "bg-white border-slate-300 text-cyan-700 hover:bg-slate-100"
              )}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{sourceMode ? "Visual View" : "</> HTML Source"}</span>
            </button>
          </div>
        </div>

        {/* Editor Workspace Canvas */}
        <div className="min-h-[480px] bg-white flex flex-col relative">
          {sourceMode ? (
            /* Raw HTML/CSS Code Editor */
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste raw responsive HTML and inline CSS code here..."
              className="w-full flex-1 p-4 font-mono text-xs text-slate-900 bg-slate-50 border-none outline-none resize-y min-h-[500px] leading-relaxed"
            />
          ) : (
            /* Visual Rich Canvas Preview (Live Sandboxed Iframe with full HTML support) */
            <div className="flex-1 flex flex-col min-h-[500px] bg-slate-200/60 p-4 overflow-auto">
              <div className="max-w-[700px] w-full mx-auto bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden flex flex-col min-h-[460px]">
                <iframe
                  title="Roundcube Live Editor Preview"
                  srcDoc={htmlContent}
                  sandbox="allow-same-origin allow-popups"
                  className="w-full flex-1 border-none min-h-[500px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Roundcube Bottom Action Bar matching Image 4 */}
        <div className={cn("px-4 py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3", isDark ? "bg-[#0c1626] border-slate-800" : "bg-slate-100 border-slate-200")}>
          <div className="flex items-center gap-3">
            {/* Primary Cyan Send Button matching Image 4 */}
            <button
              type="button"
              disabled={sendingBlast}
              onClick={() => setShowSendConfirmModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {sendingBlast ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{sendingBlast ? "Sending Blast..." : "Send Campaign Blast"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs",
                isDark ? "border-slate-700 text-zinc-300 hover:bg-white/5" : "border-slate-300 text-slate-700 hover:bg-white"
              )}
            >
              Send Test to Myself
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-zinc-400">
            <span>Target: <strong className={isDark ? "text-cyan-400" : "text-cyan-700"}>{getRecipientCount()} recipient(s)</strong></span>
            
            {/* Open in new window toggle matching Image 4 */}
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Open in new window</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Client Selection Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "border-slate-800" : "border-slate-200")}>
              <div>
                <h3 className={cn("font-bold text-base", isDark ? "text-white" : "text-slate-900")}>Select Specific Customers</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Pick which customers should receive this promotional email.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecipientModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search customer by name or email address..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className={cn(
                    "w-full pl-9 pr-4 py-2 rounded-xl border text-xs outline-none transition-colors",
                    isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                  )}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/40">
              {filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">No customer matches search.</div>
              ) : (
                filteredCustomers.map(customer => {
                  const isChecked = selectedUserIds.includes(customer.id);
                  return (
                    <label
                      key={customer.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer select-none",
                        isChecked ? (isDark ? "bg-cyan-500/10" : "bg-cyan-50") : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50")
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedUserIds(prev => prev.filter(id => id !== customer.id));
                            } else {
                              setSelectedUserIds(prev => [...prev, customer.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                        />
                        <div>
                          <p className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>{customer.name}</p>
                          <p className="text-[11px] text-zinc-500 font-mono">{customer.email}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        {customer.vpsCount > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {customer.vpsCount} VPS
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className={cn("p-4 border-t flex items-center justify-between", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
              <button
                type="button"
                onClick={() => {
                  if (selectedUserIds.length === recipientsData.customers.length) {
                    setSelectedUserIds([]);
                  } else {
                    setSelectedUserIds(recipientsData.customers.map(c => c.id));
                  }
                }}
                className="text-xs font-medium text-cyan-400 hover:underline cursor-pointer"
              >
                {selectedUserIds.length === recipientsData.customers.length ? "Deselect All" : "Select All Customers"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecipientModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer shadow-xs"
                >
                  Done ({selectedUserIds.length} Selected)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Fullscreen / Responsive Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("w-full max-w-5xl h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            <div className={cn("px-6 py-3 border-b flex items-center justify-between", isDark ? "bg-[#0c1626] border-slate-800" : "bg-slate-100 border-slate-200")}>
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-cyan-500" />
                <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>Email Preview</h3>
                <span className="text-xs text-zinc-500 font-mono truncate max-w-xs">{subject}</span>
              </div>

              {/* Device Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 rounded-lg border bg-black/20 border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1 rounded-md transition-all cursor-pointer font-semibold",
                      previewDevice === "desktop" ? "bg-cyan-500 text-slate-950 shadow-xs" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop (600px)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1 rounded-md transition-all cursor-pointer font-semibold",
                      previewDevice === "mobile" ? "bg-cyan-500 text-slate-950 shadow-xs" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (375px)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-300/80 p-4 sm:p-6 flex justify-center items-start">
              <div
                className={cn(
                  "bg-white rounded-xl shadow-2xl overflow-hidden transition-all border border-slate-400",
                  previewDevice === "desktop" ? "w-[650px] min-h-[500px]" : "w-[375px] min-h-[600px]"
                )}
              >
                <iframe
                  title="Live Responsive Preview"
                  srcDoc={htmlContent.replace(/{name}/g, "John Doe").replace(/{year}/g, new Date().getFullYear().toString())}
                  sandbox="allow-same-origin allow-popups"
                  className="w-full h-full min-h-[650px] border-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Send Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("w-full max-w-md rounded-2xl border p-6 shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <div>
                <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>Send Test Email</h3>
                <p className="text-xs text-zinc-500">Verify email layout and rendering in your own inbox.</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Recipient Test Email</label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors",
                    isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                  )}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                A single copy with subject <code>[TEST] {subject}</code> will be dispatched to this address.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingTest || !testEmailAddress}
                onClick={handleSendTest}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{sendingTest ? "Sending..." : "Send Test Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Confirm Mass Email Blast */}
      <ConfirmModal
        isOpen={showSendConfirmModal}
        onClose={() => setShowSendConfirmModal(false)}
        onConfirm={handleSendBlast}
        title="Confirm Mass Email Campaign Blast"
        description={`You are about to broadcast this email to ${getRecipientCount()} customer(s). Are you sure you want to dispatch this email blast now?`}
        confirmText={`Yes, Dispatch to ${getRecipientCount()} Recipients`}
        cancelText="Review Again"
        variant="warning"
        isLoading={sendingBlast}
      />
    </div>
  );
}
