"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  FileText,
  Calendar,
  Server,
  Settings,
  Key,
  EyeOff,
  CheckCircle2,
  Loader2,
  Info,
  Image as ImageIcon,
  UploadCloud,
  Link as LinkIcon
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

// Pre-designed Responsive Promotional Email Templates with Sharp Universal Typography
const FONT_STACK = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const PROMO_TEMPLATES = [
  {
    id: "graphic_banner_promo",
    name: "🎉 Marketing Banner Promo (IDwebhost-Style)",
    subject: "🇮🇩 Promo Spesial Masdika Cloud: Diskon Spesial & Kupon Terbatas!",
    html: `<div style="background-color: #f1f5f9; padding: 40px 15px; font-family: ${FONT_STACK};">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Top Brand Navbar -->
    <div style="padding: 18px 24px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle;">
            <a href="https://masdika.id" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px; font-weight: 900; color: #0891b2; letter-spacing: -0.5px; font-family: ${FONT_STACK};">MASDIKA<span style="color: #06b6d4;">.ID</span></span>
            </a>
          </td>
          <td style="text-align: right; vertical-align: middle; font-size: 12px; font-weight: 700; font-family: ${FONT_STACK};">
            <a href="https://masdika.id/vps" target="_blank" style="color: #475569; text-decoration: none; margin-left: 14px;">CLOUD VPS</a>
            <a href="https://masdika.id/dashboard" target="_blank" style="color: #475569; text-decoration: none; margin-left: 14px;">DASHBOARD</a>
            <a href="https://masdika.id/promos" target="_blank" style="color: #0891b2; text-decoration: none; margin-left: 14px; font-weight: 800;">PROMO</a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Hero Promotional Banner Image -->
    <div style="padding: 0; text-align: center; background: #0f172a; line-height: 0;">
      <a href="https://masdika.id/vps" target="_blank" style="display: block; text-decoration: none;">
        <img 
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80" 
          alt="Promo Spesial Masdika Cloud" 
          style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;"
        />
      </a>
    </div>

    <!-- Main Content Body -->
    <div style="padding: 32px 28px; font-family: ${FONT_STACK};">
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 14px; line-height: 1.35; font-family: ${FONT_STACK};">
        Rayakan Ekosistem Digital Indonesia Bersama Masdika Cloud 🇮🇩
      </h2>
      <p style="font-size: 15px; color: #1e293b; margin: 0 0 12px; font-weight: 600;">
        Halo <strong>{name}</strong>,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.65; margin: 0 0 20px;">
        Biar makin spesial, kami menghadirkan promo diskon eksklusif untuk layanan Cloud VPS NVMe, Dedicated IP, dan solusi infrastruktur digital terbaik untuk proyek dan bisnismu!
      </p>

      <!-- Coupon Voucher Box -->
      <div style="background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Kode Kupon Spesial</span>
        <div style="font-size: 26px; font-weight: 900; color: #15803d; font-family: 'JetBrains Mono', monospace; letter-spacing: 2px;">PROMOINDONESIA</div>
        <p style="font-size: 12px; color: #16a34a; font-weight: 600; margin: 6px 0 0;">Periode: Terbatas untuk 50 pengguna pertama</p>
      </div>

      <!-- Feature Bullet Points -->
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155; margin: 24px 0; font-family: ${FONT_STACK};">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">⚡ <strong style="color: #0f172a;">Performa Tinggi:</strong> Dedicated vCPU AMD EPYC & Storage Enterprise NVMe</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">🌐 <strong style="color: #0f172a;">Jaringan Indonesia:</strong> Port Speed hingga 1000 Mbps peering langsung ke OpenIXP</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">🛡️ <strong style="color: #0f172a;">Anti-DDoS Protection:</strong> Proteksi otomatis aktif 24/7 tanpa biaya tambahan</td>
        </tr>
      </table>

      <!-- Big Call to Action Button -->
      <div style="text-align: center; margin: 32px 0 10px;">
        <a href="https://masdika.id/vps" target="_blank" style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4); font-family: ${FONT_STACK};">
          Klaim Promo Sekarang →
        </a>
      </div>
    </div>

    <!-- Email Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; font-family: ${FONT_STACK};">
      <p style="margin: 0 0 6px;">Email ini dikirim ke akun terdaftar di Masdika Cloud Platform.</p>
      <p style="margin: 0;">© {year} PT Masdika Teknologi Indonesia. All rights reserved.</p>
    </div>
  </div>
</div>`
  },
  {
    id: "vps_sale",
    name: "⚡ VPS Cloud Flash Sale (50% OFF)",
    subject: "⚡ Flash Sale: Get 50% OFF on all High-Performance Cloud VPS!",
    html: `<div style="background-color: #f1f5f9; padding: 40px 15px; font-family: ${FONT_STACK};">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #0891b2 50%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
      <span style="background: rgba(255, 255, 255, 0.18); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; display: inline-block; margin-bottom: 12px; font-family: ${FONT_STACK};">Limited Time Offer</span>
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; font-family: ${FONT_STACK};">MASDIKA CLOUD VPS</h1>
      <p style="color: #e0f2fe; margin: 8px 0 0; font-size: 15px; font-weight: 500; font-family: ${FONT_STACK};">High-Performance Cloud Infrastructure for Developers</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 35px 30px; font-family: ${FONT_STACK};">
      <p style="font-size: 16px; color: #1e293b; margin-top: 0; font-weight: 600;">Hi <strong>{name}</strong>,</p>
      <p style="font-size: 15px; color: #334155; line-height: 1.65;">
        We're thrilled to announce an exclusive limited-time promotion on our Enterprise Proxmox Cloud VPS. Upgrade your servers today and experience blazing-fast NVMe storage, dedicated vCPU performance, and flexible bandwidth speed tiers up to 1000 Mbps!
      </p>

      <!-- Promo Box -->
      <div style="background: #f8fafc; border: 2px dashed #06b6d4; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
        <span style="font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px; font-family: ${FONT_STACK};">Use Coupon Code at Checkout</span>
        <div style="font-size: 28px; font-weight: 900; color: #0891b2; font-family: 'JetBrains Mono', monospace; letter-spacing: 2px;">FLASH50CLOUD</div>
        <p style="font-size: 13px; color: #10b981; font-weight: 700; margin: 8px 0 0;">✓ Valid for the first 50 orders this month</p>
      </div>

      <!-- Feature Highlights -->
      <div style="margin: 28px 0;">
        <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 14px; font-weight: 700; font-family: ${FONT_STACK};">Included with every Cloud VPS:</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155; font-family: ${FONT_STACK};">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">🚀 <strong style="color: #0f172a;">Ultra-Low Latency:</strong> Direct Indonesia IDC Tier-3 datacenter connection</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">⚡ <strong style="color: #0f172a;">Bandwidth Upgrades:</strong> Configurable speed tiers up to 1000 Mbps</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">🛡️ <strong style="color: #0f172a;">Automated Protection:</strong> Enterprise Proxmox firewall & hardware isolation</td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">🔄 <strong style="color: #0f172a;">Instant Delivery:</strong> Fully online in less than 60 seconds with Cloud-Init</td>
          </tr>
        </table>
      </div>

      <!-- Call to Action Button -->
      <div style="text-align: center; margin: 35px 0 15px;">
        <a href="https://masdika.id/vps" style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4); font-family: ${FONT_STACK};">
          Deploy VPS Now with 50% OFF →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; font-family: ${FONT_STACK};">
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
    html: `<div style="background-color: #f1f5f9; padding: 40px 15px; font-family: ${FONT_STACK};">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); padding: 35px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; font-family: ${FONT_STACK};">NEW FEATURE RELEASE</h1>
      <p style="color: #e0f2fe; margin: 6px 0 0; font-size: 14px; font-family: ${FONT_STACK};">Dynamic Bandwidth Port Speed Limits</p>
    </div>
    <div style="padding: 35px 30px; font-family: ${FONT_STACK};">
      <p style="font-size: 16px; color: #1e293b; margin-top: 0; font-weight: 600;">Hello <strong>{name}</strong>,</p>
      <p style="font-size: 15px; color: #334155; line-height: 1.65;">
        We have officially upgraded our network infrastructure! You can now customize your VPS port speed limits with fine-grained tiers from <strong>100 Mbps (Free Base)</strong> all the way up to <strong>1000 Mbps Gigabit</strong> directly from your client control panel.
      </p>
      <div style="text-align: center; margin: 30px 0 10px;">
        <a href="https://masdika.id/dashboard/vps" style="background-color: #06b6d4; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; font-family: ${FONT_STACK};">
          Configure My VPS Speed →
        </a>
      </div>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; font-family: ${FONT_STACK};">
      © {year} PT Masdika Teknologi Indonesia. All rights reserved.
    </div>
  </div>
</div>`
  },
  {
    id: "maintenance",
    name: "🛠️ Scheduled System Maintenance Notice",
    subject: "🛠️ Notice: Scheduled Infrastructure Maintenance Window",
    html: `<div style="background-color: #f1f5f9; padding: 40px 15px; font-family: ${FONT_STACK};">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    <div style="background: #0f172a; padding: 35px 30px; text-align: center; border-bottom: 3px solid #f59e0b;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; font-family: ${FONT_STACK};">SCHEDULED MAINTENANCE</h1>
      <p style="color: #fbbf24; margin: 6px 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; font-family: ${FONT_STACK};">Infrastructure Hardware Upgrade</p>
    </div>
    <div style="padding: 35px 30px; font-family: ${FONT_STACK};">
      <p style="font-size: 15px; color: #1e293b; margin-top: 0; font-weight: 600;">Dear <strong>{name}</strong>,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.65;">
        To ensure optimal stability, throughput, and security, our engineering team will be performing scheduled network and hypervisor maintenance.
      </p>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 20px; margin: 24px 0; font-family: ${FONT_STACK};">
        <p style="margin: 0 0 8px; font-size: 14px; color: #92400e;"><strong>Maintenance Window:</strong> Sunday, 01:00 AM – 04:00 AM (WIB)</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #92400e;"><strong>Expected Impact:</strong> Brief latency spikes or momentary disconnection under 5 minutes.</p>
        <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Scope:</strong> Core Proxmox hypervisor nodes & upstream routers.</p>
      </div>
      <p style="font-size: 14px; color: #334155;">If you experience any issues after this maintenance period, please open a ticket with our 24/7 support desk.</p>
    </div>
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; font-family: ${FONT_STACK};">
      © {year} PT Masdika Teknologi Indonesia. All rights reserved.
    </div>
  </div>
</div>`
  },
  {
    id: "blank",
    name: "📄 Blank Clean Canvas",
    subject: "",
    html: `<div style="background-color: #f8fafc; padding: 30px 15px; font-family: ${FONT_STACK};">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0; font-family: ${FONT_STACK};">
    <h2 style="color: #0891b2; margin-top: 0; font-family: ${FONT_STACK};">Hello {name},</h2>
    <p style="color: #334155; font-size: 15px; line-height: 1.65;">Write your promotional email announcement here...</p>
    <div style="margin: 30px 0;">
      <a href="https://masdika.id" style="background-color: #06b6d4; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-family: ${FONT_STACK};">Learn More</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 15px;" />
    <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0; font-family: ${FONT_STACK};">© {year} PT Masdika Teknologi Indonesia. All rights reserved.</p>
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
  const [senderEmail, setSenderEmail] = useState("info@masdika.id");
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

  // Image Insert Modal State
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageTab, setImageTab] = useState<"upload" | "url">("upload");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageLinkInput, setImageLinkInput] = useState("https://masdika.id/vps");
  const [imageAltInput, setImageAltInput] = useState("Promo Spesial Masdika Cloud");
  const [imageMaxWidth, setImageMaxWidth] = useState("600px");
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, GIF)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size exceeds the 10MB limit");
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading("Uploading image banner to server...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "email-blast");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to upload image");
      }

      // Convert to full absolute URL required for email delivery
      const fullUrl = window.location.origin + data.url;
      setImageUrlInput(fullUrl);
      toast.success("Image uploaded! Ready to insert into email.", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image", { id: toastId });
    } finally {
      setUploadingImage(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
      }
    }
  };

  const handleInsertImage = () => {
    if (!imageUrlInput.trim()) {
      toast.error("Please upload an image or provide an image URL");
      return;
    }

    const cleanUrl = imageUrlInput.trim();
    const cleanLink = imageLinkInput.trim();
    const cleanAlt = imageAltInput.trim() || "Promotional Banner";
    const maxWidth = imageMaxWidth || "600px";

    const imageHtml = `
<!-- Promotional Banner Image -->
<div style="text-align: center; margin: 24px 0;">
  ${cleanLink ? `<a href="${cleanLink}" target="_blank" style="text-decoration: none; display: inline-block; width: 100%; max-width: ${maxWidth};">` : ''}
    <img src="${cleanUrl}" alt="${cleanAlt}" style="width: 100%; max-width: ${maxWidth}; height: auto; display: block; margin: 0 auto; border-radius: 12px; border: 0;" />
  ${cleanLink ? `</a>` : ''}
</div>`;

    if (htmlContent.includes("<!-- Footer -->")) {
      setHtmlContent(prev => prev.replace("<!-- Footer -->", `${imageHtml}\n\n    <!-- Footer -->`));
    } else {
      setHtmlContent(prev => prev + imageHtml);
    }

    setShowImageModal(false);
    toast.success("Banner image inserted into email successfully!");
  };

  // Dedicated SMTP Configuration State
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: 465,
    secure: true,
    user: "info@masdika.id",
    pass: "",
    fromName: "Masdika.ID",
    fromEmail: "info@masdika.id",
    hasPassword: false,
    isConfigured: false
  });
  const [loadingSmtp, setLoadingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchSmtpSettings = useCallback(async () => {
    setLoadingSmtp(true);
    try {
      const res = await fetch("/api/admin/email-blast/settings");
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        setSmtpConfig({
          host: data.settings.host || "",
          port: data.settings.port || 465,
          secure: data.settings.secure !== undefined ? data.settings.secure : true,
          user: data.settings.user || "info@masdika.id",
          pass: "",
          fromName: data.settings.fromName || "Masdika.ID",
          fromEmail: data.settings.fromEmail || "info@masdika.id",
          hasPassword: Boolean(data.settings.hasPassword),
          isConfigured: Boolean(data.settings.isConfigured)
        });
        if (data.settings.fromEmail) setSenderEmail(data.settings.fromEmail);
        if (data.settings.fromName) setSenderName(data.settings.fromName);
      }
    } catch (err) {
      console.error("Failed to load SMTP settings:", err);
    } finally {
      setLoadingSmtp(false);
    }
  }, []);

  const handleSaveSmtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSmtp(true);
    try {
      const res = await fetch("/api/admin/email-blast/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpConfig)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "SMTP settings saved successfully");
        setSmtpConfig(prev => ({
          ...prev,
          isConfigured: Boolean(prev.host && prev.user),
          hasPassword: Boolean(prev.pass || prev.hasPassword),
          pass: ""
        }));
        if (smtpConfig.fromEmail) setSenderEmail(smtpConfig.fromEmail);
        if (smtpConfig.fromName) setSenderName(smtpConfig.fromName);
        setShowSmtpModal(false);
      } else {
        toast.error(data.error || "Failed to save SMTP settings");
      }
    } catch {
      toast.error("An error occurred while saving SMTP settings");
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await fetch("/api/admin/email-blast/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpConfig)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "SMTP Connection Successful!");
      } else {
        toast.error(data.error || "SMTP Connection Failed");
      }
    } catch {
      toast.error("Failed to test SMTP connection");
    } finally {
      setTestingSmtp(false);
    }
  };

  const formatBlastPreviewHtml = (raw: string) => {
    const rendered = raw
      .replace(/{name}/g, "John Doe")
      .replace(/{year}/g, new Date().getFullYear().toString())
      .replace(/{email}/g, "customer@example.com");

    const fontInject = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
        body, table, td, p, span, div, a, li, strong, b, h1, h2, h3, h4, h5, h6 {
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
      </style>
    `;

    if (rendered.includes("<head>")) {
      return rendered.replace("<head>", `<head>${fontInject}`);
    }
    if (rendered.includes("<html")) {
      return rendered.replace(/<html[^>]*>/, `$&<head>${fontInject}</head>`);
    }
    return `<!DOCTYPE html><html><head>${fontInject}</head><body style="margin:0;padding:20px;font-family:'Plus Jakarta Sans','Inter',sans-serif;">${rendered}</body></html>`;
  };

  const fetchRecipients = useCallback(async () => {
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
  }, []);

  // Fetch recipients and SMTP settings on mount
  useEffect(() => {
    fetchRecipients();
    fetchSmtpSettings();
  }, [fetchRecipients, fetchSmtpSettings]);

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
    <div className="w-full space-y-6 pb-12">
      {/* Top Header matching Gambar 1 */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-2">
        <div className="min-w-0">
          <h1 className={cn("text-2xl md:text-3xl font-extrabold mb-1 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Newsletter & Email Blast
          </h1>
          <p className={cn("text-xs sm:text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage registered audience email subscriptions and outbound campaign deliverability.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <div className={cn("px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold text-xs border text-center flex items-center justify-center whitespace-nowrap", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            <Users className="w-3.5 h-3.5 mr-1.5 shrink-0 hidden sm:inline" />
            <span>Audience: <strong>{getRecipientCount()}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => fetchRecipients()}
            className={cn(
              "justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer whitespace-nowrap",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", loadingRecipients ? "animate-spin" : "")} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className={cn(
              "justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer whitespace-nowrap",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className={cn(
              "justify-center px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer whitespace-nowrap",
              isDark ? "border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400" : "border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-800"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Send Test</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSmtpModal(true)}
            className={cn(
              "justify-center px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer whitespace-nowrap",
              smtpConfig.isConfigured
                ? (isDark ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400" : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800")
                : (isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")
            )}
            title="Configure dedicated SMTP for Email Blast (info@masdika.id)"
          >
            <Server className="w-3.5 h-3.5 shrink-0" />
            <span>SMTP Server</span>
            {smtpConfig.isConfigured && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>
        </div>
      </div>

      {/* Stat Cards matching Gambar 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-3 sm:p-4 md:p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider leading-tight min-w-0 pr-1 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Total Subscribers</span>
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 -mt-0.5", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>
          </div>
          <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {recipientsData.totalCustomers}
          </div>
          <div className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium truncate", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Verified recipient emails
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-3 sm:p-4 md:p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider leading-tight min-w-0 pr-1 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Service Clients</span>
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 -mt-0.5", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>
          </div>
          <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {recipientsData.vpsCustomers}
          </div>
          <div className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium truncate", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Active cloud instances
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-3 sm:p-4 md:p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider leading-tight min-w-0 pr-1 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Audience Reach</span>
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 -mt-0.5", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>
          </div>
          <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {getRecipientCount()}
          </div>
          <div className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium truncate", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Instant campaign audience
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-3 sm:p-4 md:p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider leading-tight min-w-0 pr-1 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Deliverability</span>
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 -mt-0.5", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>
          </div>
          <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            100%
          </div>
          <div className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium truncate", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Zero bounce rate
          </div>
        </div>
      </div>

      {/* Main Campaign Composer Container matching Gambar 1 styling */}
      <div className={cn("rounded-2xl border overflow-hidden shadow-md", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
        
        {/* Action Bar Header */}
        <div className={cn("px-3 sm:px-4 py-2.5 sm:py-3 border-b flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4", isDark ? "bg-[#060b14] border-slate-800/80" : "bg-slate-50 border-slate-200")}>
          <div className="flex items-center gap-4 sm:gap-6 text-xs font-semibold overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => toast.success("Draft automatically saved to local session")}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span className="text-[10px]">Save</span>
            </button>
            <button
              type="button"
              onClick={() => toast.info("Attachments are embedded directly via images or URLs in HTML.")}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
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
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
            >
              <PenTool className="w-4 h-4" />
              <span className="text-[10px]">Signature</span>
            </button>

            {/* Templates Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowTemplatesDropdown(prev => !prev)}
                className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px]">Templates</span>
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

            <button
              type="button"
              onClick={() => setShowSmtpModal(true)}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
              title="Configure SMTP Server & Credentials"
            >
              <Server className="w-4 h-4" />
              <span className="text-[10px]">SMTP</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-[11px] font-mono px-2.5 sm:px-3 py-1 rounded-lg border flex items-center gap-1.5 font-bold", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>{getRecipientCount()} Recipients</span>
            </span>
          </div>
        </div>

        {/* Fields: From, To, Subject */}
        <div className={cn("divide-y text-xs sm:text-sm border-b", isDark ? "divide-slate-800/80 border-slate-800/80 bg-[#0b1322]" : "divide-slate-200 border-slate-200 bg-slate-50/70")}>
          
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
                    className={cn("px-3 py-1.5 rounded-lg border text-xs outline-none flex-1", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-800")}
                  />
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="info@masdika.id"
                    className={cn("px-3 py-1.5 rounded-lg border text-xs outline-none flex-1 font-mono", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-800")}
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
              {/* Target Type Selector Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap",
                    targetType === "all"
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-bold shadow-xs"
                      : isDark ? "bg-[#060b14] border-slate-800 text-zinc-400 hover:text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  All Customers ({recipientsData.totalCustomers})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("vps")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap",
                    targetType === "vps"
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-bold shadow-xs"
                      : isDark ? "bg-[#060b14] border-slate-800 text-zinc-400 hover:text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Active VPS ({recipientsData.vpsCustomers})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("selected");
                    setShowRecipientModal(true);
                  }}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                    targetType === "selected"
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-bold shadow-xs"
                      : isDark ? "bg-[#060b14] border-slate-800 text-zinc-400 hover:text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <span>Select Specific ({selectedUserIds.length})</span>
                  <Users className="w-3 h-3 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("custom")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap",
                    targetType === "custom"
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-bold shadow-xs"
                      : isDark ? "bg-[#060b14] border-slate-800 text-zinc-400 hover:text-white" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Custom List
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
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
              )}
            </div>

            {/* Contact modal trigger */}
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
                    ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
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

            <span className="w-px h-4 bg-slate-700 mx-1" />

            {/* Insert Image Button */}
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              title="Insert Image / Upload Banner"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs",
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                  : "bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Insert Image</span>
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
        <div className={cn("min-h-[480px] flex flex-col relative", isDark ? "bg-[#060b14]" : "bg-white")}>
          {sourceMode ? (
            /* Raw HTML/CSS Code Editor */
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste raw responsive HTML and inline CSS code here..."
              className={cn(
                "w-full flex-1 p-4 font-mono text-xs border-none outline-none resize-y min-h-[500px] leading-relaxed",
                isDark ? "bg-[#060b14] text-zinc-200 placeholder:text-zinc-600" : "bg-slate-50 text-slate-900 placeholder:text-slate-400"
              )}
            />
          ) : (
            /* Visual Rich Canvas Preview (Live Sandboxed Iframe with full HTML support) */
            <div className={cn("flex-1 flex flex-col min-h-[580px] w-full overflow-hidden", isDark ? "bg-[#030712]" : "bg-slate-200/60")}>
              <iframe
                title="Roundcube Live Editor Preview"
                srcDoc={htmlContent}
                sandbox="allow-same-origin allow-popups"
                className="w-full flex-1 border-none min-h-[580px]"
              />
            </div>
          )}
        </div>

        {/* Bottom Action Bar matching Gambar 1 */}
        <div className={cn("px-3 sm:px-5 py-2.5 sm:py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3", isDark ? "bg-[#060b14] border-slate-800/80" : "bg-slate-50 border-slate-200")}>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Primary Cyan Send Button */}
            <button
              type="button"
              disabled={sendingBlast}
              onClick={() => setShowSendConfirmModal(true)}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-bold text-xs bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 transition-all shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {sendingBlast ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Send className="w-3.5 h-3.5 shrink-0" />}
              <span>{sendingBlast ? "Sending..." : "Send Blast"}</span>
              <span className="hidden md:inline">{sendingBlast ? "" : " Campaign"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs whitespace-nowrap",
                isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-300 text-slate-700 hover:bg-white"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Send Test</span>
              <span className="hidden md:inline"> to Myself</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-zinc-400">
            <span className="text-[11px] sm:text-xs">
              Target: <strong className={isDark ? "text-cyan-400 font-bold" : "text-cyan-700 font-bold"}>{getRecipientCount()} recipient(s)</strong>
            </span>
            
            {/* Open in new window toggle */}
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-1.5 text-[11px] sm:text-xs hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>Full Preview</span>
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
                  const avatarUrl = customer.image || `/api/avatar?email=${encodeURIComponent(customer.email || '')}&name=${encodeURIComponent(customer.name || 'User')}`;
                  return (
                    <div
                      key={customer.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedUserIds(prev => prev.filter(id => id !== customer.id));
                        } else {
                          setSelectedUserIds(prev => [...prev, customer.id]);
                        }
                      }}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer select-none border",
                        isChecked
                          ? (isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")
                          : (isDark ? "hover:bg-white/5 border-transparent" : "hover:bg-slate-50 border-transparent")
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Custom Checkbox matching Gambar 2 */}
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all shadow-xs",
                            isChecked
                              ? "bg-cyan-500 border border-cyan-400 text-slate-950"
                              : isDark
                              ? "border border-slate-700 bg-[#060b14] group-hover:border-slate-500"
                              : "border border-slate-300 bg-white group-hover:border-slate-400"
                          )}
                        >
                          {isChecked && <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>

                        {/* Customer Profile Photo Avatar matching Customer Menu (Gambar 3) */}
                        <div className={cn("w-9 h-9 rounded-full overflow-hidden border shrink-0 bg-slate-800", isDark ? "border-slate-800" : "border-slate-200")}>
                          <img
                            referrerPolicy="no-referrer"
                            src={avatarUrl}
                            alt={customer.name || "Customer"}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>

                        {/* Name and Email */}
                        <div className="min-w-0">
                          <p className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                            {customer.name || "Customer"}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-mono truncate">
                            {customer.email}
                          </p>
                        </div>
                      </div>

                      {/* VPS Badge */}
                      <div className="text-right shrink-0 ml-3">
                        {customer.vpsCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {customer.vpsCount} VPS
                          </span>
                        )}
                      </div>
                    </div>
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
                  className="px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer shadow-xs"
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
          <div className={cn("w-full max-w-5xl h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
            <div className={cn("px-3 sm:px-6 py-2.5 sm:py-3 border-b flex items-center justify-between gap-2", isDark ? "bg-[#060b14] border-slate-800/80" : "bg-slate-100 border-slate-200")}>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
                <h3 className={cn("font-bold text-xs sm:text-sm shrink-0", isDark ? "text-white" : "text-slate-900")}>Email Preview</h3>
                <span className="text-[11px] text-zinc-500 font-mono truncate max-w-[120px] sm:max-w-xs hidden sm:inline">{subject}</span>
              </div>

              {/* Device Toggle */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center p-0.5 rounded-lg border bg-black/20 border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={cn(
                      "flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md transition-all cursor-pointer font-semibold text-[11px] sm:text-xs",
                      previewDevice === "desktop" ? "bg-cyan-500 text-slate-950 shadow-xs" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5 shrink-0" />
                    <span>Desktop<span className="hidden sm:inline"> (600px)</span></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={cn(
                      "flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md transition-all cursor-pointer font-semibold text-[11px] sm:text-xs",
                      previewDevice === "mobile" ? "bg-cyan-500 text-slate-950 shadow-xs" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
                    <span>Mobile<span className="hidden sm:inline"> (375px)</span></span>
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

            <div className={cn("flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start", isDark ? "bg-[#030712]" : "bg-slate-200/80")}>
              <div
                className={cn(
                  "rounded-xl shadow-2xl overflow-hidden transition-all border",
                  isDark ? "bg-[#0f172a] border-slate-800" : "bg-white border-slate-300",
                  previewDevice === "desktop" ? "w-[650px] min-h-[500px]" : "w-[375px] min-h-[600px]"
                )}
              >
                <iframe
                  title="Live Responsive Preview"
                  srcDoc={formatBlastPreviewHtml(htmlContent)}
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

            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingTest || !testEmailAddress}
                onClick={handleSendTest}
                className="flex items-center gap-1.5 px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Send className="w-3.5 h-3.5 shrink-0" />}
                <span>{sendingTest ? "Sending..." : "Send Test Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Insert Image / Banner Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn(
            "w-full max-w-lg rounded-2xl border p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
            isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Insert Promo Image / Banner</h3>
                  <p className="text-xs text-zinc-500">Insert responsive graphic banner into your promotional email.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 border border-white/5 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImageTab("upload")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  imageTab === "upload"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload From Computer</span>
              </button>
              <button
                type="button"
                onClick={() => setImageTab("url")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  imageTab === "url"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>External Image URL</span>
              </button>
            </div>

            <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {/* Tab 1: Upload */}
              {imageTab === "upload" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Select Banner File (PNG, JPG, WebP)</label>
                  <div
                    onClick={() => imageFileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2",
                      isDark ? "border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5" : "border-slate-300 hover:border-cyan-500 hover:bg-cyan-50"
                    )}
                  >
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImageFile}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-cyan-400">Click to upload banner</span> or drag and drop
                    </div>
                    <p className="text-[11px] text-zinc-500">Max size 10MB. Automatically compressed to WebP for fast email loading.</p>
                  </div>
                </div>
              )}

              {/* Tab 2: URL */}
              {imageTab === "url" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Image URL (Must start with https://)</label>
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://example.com/banner-promo.jpg"
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-mono outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
              )}

              {/* Uploaded / Current Image Preview */}
              {imageUrlInput && (
                <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex items-center gap-3">
                  <img
                    src={imageUrlInput}
                    alt="Preview"
                    className="w-16 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-bold text-cyan-400 truncate">Image ready to insert</div>
                    <div className="text-[11px] text-zinc-400 font-mono truncate">{imageUrlInput}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrlInput("")}
                    className="p-1 rounded text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Clickable Destination Link */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Destination Link (When recipient clicks the banner)
                </label>
                <input
                  type="url"
                  value={imageLinkInput}
                  onChange={(e) => setImageLinkInput(e.target.value)}
                  placeholder="https://masdika.id/vps"
                  className={cn(
                    "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-mono outline-none transition-colors",
                    isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                  )}
                />
              </div>

              {/* Alt Text & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Alt Text (Image description)</label>
                  <input
                    type="text"
                    value={imageAltInput}
                    onChange={(e) => setImageAltInput(e.target.value)}
                    placeholder="Promo Spesial Cloud VPS"
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Banner Width</label>
                  <select
                    value={imageMaxWidth}
                    onChange={(e) => setImageMaxWidth(e.target.value)}
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors cursor-pointer",
                      isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600"
                    )}
                  >
                    <option value="600px">Full Width (600px - Recommended for Hero Banner)</option>
                    <option value="450px">Medium (450px)</option>
                    <option value="300px">Small (300px)</option>
                    <option value="180px">Logo / Icon (180px)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2 shrink-0 mt-3">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!imageUrlInput.trim() || uploadingImage}
                onClick={handleInsertImage}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Insert Banner into Email</span>
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
      {/* MODAL 5: SMTP Server Configuration Modal */}
      {showSmtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("w-full max-w-xl rounded-2xl border p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                  <Server className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                </div>
                <div>
                  <h3 className={cn("text-sm sm:text-base font-bold", isDark ? "text-white" : "text-slate-900")}>Email Blast SMTP Configuration</h3>
                  <p className={cn("text-[11px] sm:text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Dedicated SMTP server for marketing campaigns & newsletters (info@masdika.id)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmtpModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSmtp} className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-none">
              {/* Info Alert */}
              <div className={cn("p-3 rounded-xl border flex items-start gap-2.5 text-xs", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800")}>
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                <p className="leading-relaxed">
                  This configuration is used exclusively for the <strong>Email Blast</strong> module. Primary transactional emails (e.g. registration OTP, invoices, order notifications) continue running independently on the system SMTP. Passwords are encrypted.
                </p>
              </div>

              {/* Host & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">SMTP Host / Server</label>
                  <input
                    type="text"
                    required
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="mail.masdika.id or smtp.gmail.com"
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors font-mono",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={smtpConfig.port}
                    onChange={(e) => {
                      const p = parseInt(e.target.value, 10) || 465;
                      setSmtpConfig(prev => ({ ...prev, port: p, secure: p === 465 }));
                    }}
                    placeholder="465"
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors font-mono",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
              </div>

              {/* Security Mode */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Security Protocol</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSmtpConfig(prev => ({ ...prev, secure: true, port: 465 }))}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      smtpConfig.secure
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                        : isDark ? "bg-[#060b14] border-slate-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
                    <span>SSL / TLS (Port 465)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmtpConfig(prev => ({ ...prev, secure: false, port: 587 }))}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      !smtpConfig.secure
                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                        : isDark ? "bg-[#060b14] border-slate-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
                    <span>STARTTLS (Port 587)</span>
                  </button>
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    required
                    value={smtpConfig.user}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, user: e.target.value, fromEmail: e.target.value }))}
                    placeholder="info@masdika.id"
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors font-mono",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    SMTP Password
                    {smtpConfig.hasPassword && !smtpConfig.pass && (
                      <span className="text-[10px] text-emerald-400 font-normal ml-1.5">(Saved)</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={smtpConfig.pass}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))}
                      placeholder={smtpConfig.hasPassword ? "•••••••• (Leave blank to keep unchanged)" : "Email password"}
                      className={cn(
                        "w-full px-3.5 py-2 pr-10 rounded-xl border text-xs sm:text-sm outline-none transition-colors",
                        isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sender Name & Sender Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Default Sender Name</label>
                  <input
                    type="text"
                    value={smtpConfig.fromName}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Masdika.ID"
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Default Sender Email</label>
                  <input
                    type="email"
                    value={smtpConfig.fromEmail}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="info@masdika.id"
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors font-mono",
                      isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                    )}
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Blast SMTP Status:</span>
                {smtpConfig.isConfigured ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Custom Configured ({smtpConfig.user})
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    Using System Default (.env)
                  </span>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  disabled={testingSmtp || (!smtpConfig.host || !smtpConfig.user)}
                  onClick={handleTestSmtp}
                  className={cn(
                    "w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50",
                    isDark ? "border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400" : "border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-800"
                  )}
                >
                  {testingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <RefreshCw className="w-3.5 h-3.5 shrink-0" />}
                  <span>{testingSmtp ? "Testing Connection..." : "Test SMTP Connection"}</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSmtpModal(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={savingSmtp || loadingSmtp}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {savingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 shrink-0" />}
                    <span>{savingSmtp ? "Saving..." : "Save Settings"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
