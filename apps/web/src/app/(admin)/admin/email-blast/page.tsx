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
  Trash2,
  Bookmark
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";

// Pre-designed Responsive Promotional Email Templates with Sharp Universal Typography
const FONT_STACK = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const PROMO_TEMPLATES = [
  {
    id: "vps_upgrade_pricing",
    name: "🚀 Update Harga Upgrade VPS & Bandwidth (Official)",
    subject: "Update Harga Upgrade VPS Masdika Cloud",
    html: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Upgrade VPS - Masdika Cloud</title>
</head>

<body style="margin:0;padding:0;background-color:#eeeeee;">

  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#eeeeee;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Informasi terbaru harga upgrade VPS Masdika Cloud dan bandwidth 100 Mbps gratis tanpa FUP.
  </div>

  <!-- Outer Background -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="width:100%;background-color:#eeeeee;">
    <tr>
      <td align="center" style="padding:0 12px 35px;border-top:5px solid #087cf5;">

        <!-- Online Version -->
        <table role="presentation" width="650" cellspacing="0" cellpadding="0" border="0"
          style="width:100%;max-width:650px;">
          <tr>
            <td align="right" style="padding:15px 5px;font-family:'Plus Jakarta Sans','Inter',Arial,sans-serif;font-size:11px;">
              <a href="{web_version_url}" target="_blank"
                style="color:#0756cf;text-decoration:underline;">
                Lihat versi online
              </a>
            </td>
          </tr>
        </table>

        <!-- Email Container -->
        <table role="presentation" width="650" cellspacing="0" cellpadding="0" border="0"
          style="width:100%;max-width:650px;background-color:#ffffff;">

          <!-- NAVBAR -->
          <tr>
            <td style="padding:24px 25px 20px;background-color:#ffffff;">

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <!-- Official Logo -->
                  <td valign="middle" style="width:48%;padding:0;">
                    <a href="https://www.masdika.id" target="_blank"
                      style="text-decoration:none;display:inline-block;">
                      <img
                        src="https://cdn.droptocdn.com/files/06f1876b-91d4-4ecf-86c8-4a3ff6257c4f/masdika-logo-light-mode.svg"
                        alt="Masdika Cloud"
                        width="175"
                        style="display:block;width:175px;max-width:100%;height:auto;border:0;"
                      >
                    </a>
                  </td>

                  <!-- Navigation -->
                  <td valign="middle" align="right"
                    style="font-family:'Plus Jakarta Sans','Inter',Arial,sans-serif;font-size:11px;font-weight:700;white-space:nowrap;">

                    <a href="https://www.masdika.id/vps" target="_blank"
                      style="display:inline-block;color:#16417e;text-decoration:none;padding:9px 8px;">
                      CLOUD VPS
                    </a>

                    <a href="https://www.masdika.id/dashboard" target="_blank"
                      style="display:inline-block;color:#16417e;text-decoration:none;padding:9px 8px;">
                      DASHBOARD
                    </a>

                    <a href="https://www.masdika.id/promos" target="_blank"
                      style="display:inline-block;color:#087cf5;text-decoration:none;font-weight:800;padding:9px 0 9px 8px;">
                      PROMO
                    </a>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Navbar Divider -->
          <tr>
            <td style="padding:0 25px;">
              <div style="height:1px;background-color:#e8edf5;font-size:1px;line-height:1px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Hero Banner -->
          <tr>
            <td style="padding:20px 25px 0;background-color:#ffffff;">
              <a href="https://www.masdika.id/vps" target="_blank"
                style="display:block;text-decoration:none;">
                <img
                  src="https://cdn.droptocdn.com/files/d7fe0d40-60e7-4f76-a21b-e2a7d355a366/Masdika_Cloud_VPS_Upgrade_Banner.png"
                  alt="Pengumuman perubahan harga upgrade VPS Masdika Cloud"
                  width="600"
                  style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:8px;"
                >
              </a>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:27px 25px 30px;font-family:'Plus Jakarta Sans','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

              <h1 style="font-size:24px;line-height:1.4;font-weight:800;color:#102d68;margin:0 0 20px;">
                Update Harga Upgrade VPS Masdika Cloud
              </h1>

              <p style="font-size:14px;line-height:1.8;color:#243b5b;margin:0 0 12px;">
                Halo <strong>{name}</strong>,
              </p>

              <p style="font-size:14px;line-height:1.85;color:#475569;margin:0 0 18px;">
                Kami punya informasi terbaru untuk kamu! Masdika Cloud menghadirkan penyesuaian harga upgrade resource VPS serta fleksibilitas peningkatan kecepatan bandwidth agar spesifikasi server bisa disesuaikan dengan kebutuhanmu.
              </p>

              <!-- Infrastructure Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="background-color:#eff8ff;border:1px solid #c9e7ff;">
                <tr>
                  <td style="padding:18px 19px;border-left:4px solid #087cf5;">
                    <div style="font-size:15px;font-weight:800;color:#0756cf;margin:0 0 8px;">
                      Infrastruktur Lebih Baik, Performa Lebih Optimal
                    </div>
                    <p style="font-size:13px;line-height:1.8;color:#405775;margin:0;">
                      Penyesuaian harga dilakukan untuk mendukung peningkatan kualitas infrastruktur Masdika Cloud agar layanan semakin stabil dan performa server terus berkembang.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Pricing -->
              <h2 style="font-size:20px;line-height:1.4;font-weight:800;color:#102d68;margin:29px 0 8px;">
                Daftar Harga Upgrade Resource
              </h2>

              <p style="font-size:13px;line-height:1.7;color:#64748b;margin:0 0 15px;">
                Berikut biaya untuk setiap penambahan resource VPS.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="border-collapse:collapse;font-family:'Plus Jakarta Sans','Inter',Arial,sans-serif;">

                <tr>
                  <td style="padding:14px 13px;background-color:#edf6ff;border-bottom:1px solid #dbeafe;">
                    <div style="font-size:14px;font-weight:800;color:#102d68;">CPU</div>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">Per tambahan 1 CPU</div>
                  </td>
                  <td align="right" valign="middle" style="padding:14px 13px;background-color:#edf6ff;border-bottom:1px solid #dbeafe;white-space:nowrap;">
                    <strong style="font-size:16px;color:#0756cf;">Rp50.000</strong>
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 13px;border-bottom:1px solid #e2e8f0;">
                    <div style="font-size:14px;font-weight:800;color:#102d68;">RAM</div>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">Per tambahan 1 GB</div>
                  </td>
                  <td align="right" valign="middle" style="padding:14px 13px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">
                    <strong style="font-size:16px;color:#0756cf;">Rp50.000</strong>
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 13px;background-color:#edf6ff;border-bottom:1px solid #dbeafe;">
                    <div style="font-size:14px;font-weight:800;color:#102d68;">Storage HDD</div>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">Per tambahan 1 GB</div>
                  </td>
                  <td align="right" valign="middle" style="padding:14px 13px;background-color:#edf6ff;border-bottom:1px solid #dbeafe;white-space:nowrap;">
                    <strong style="font-size:16px;color:#0756cf;">Rp4.000</strong>
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 13px;border-bottom:1px solid #e2e8f0;">
                    <div style="font-size:14px;font-weight:800;color:#102d68;">Storage SSD</div>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">Per tambahan 1 GB</div>
                  </td>
                  <td align="right" valign="middle" style="padding:14px 13px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">
                    <strong style="font-size:16px;color:#0756cf;">Rp5.000</strong>
                  </td>
                </tr>

              </table>

              <!-- Bandwidth -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="margin-top:25px;background-color:#0756cf;border-collapse:separate;">
                <tr>
                  <td align="center" style="padding:24px 18px;">
                    <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#bceaff;">
                      VPS BANDWIDTH
                    </div>
                    <div style="font-size:30px;line-height:1.5;font-weight:900;color:#ffffff;margin-top:6px;">
                      100 Mbps GRATIS
                    </div>
                    <div style="font-size:13px;line-height:1.8;color:#dbeafe;">
                      Unlimited Bandwidth · No FUP
                    </div>

                    <div style="height:1px;background-color:#3986df;margin:18px 0;"></div>

                    <div style="font-size:13px;color:#dbeafe;">
                      Upgrade setiap kelipatan 50 Mbps
                    </div>
                    <div style="font-size:24px;line-height:1.6;font-weight:900;color:#ffffff;">
                      Rp50.000
                    </div>
                    <div style="font-size:12px;color:#c4e3ff;">
                      per tambahan 50 Mbps
                    </div>

                    <div style="margin-top:16px;padding:12px;background-color:#ffffff;color:#0756cf;font-size:13px;line-height:1.7;">
                      <strong>Contoh:</strong> 150 Mbps = Rp50.000 biaya upgrade bandwidth.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Service Features -->
              <h2 style="font-size:19px;line-height:1.4;font-weight:800;color:#102d68;margin:29px 0 13px;">
                Pilihan VPS untuk Kebutuhanmu
              </h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:11px 0;border-bottom:1px solid #edf2f7;font-size:13px;line-height:1.8;color:#334155;">
                    <strong style="color:#0756cf;">&#10003; VPS Windows & Linux</strong><br>
                    Pilih sistem operasi yang sesuai dengan aplikasi kamu.
                  </td>
                </tr>
                <tr>
                  <td style="padding:11px 0;border-bottom:1px solid #edf2f7;font-size:13px;line-height:1.8;color:#334155;">
                    <strong style="color:#0756cf;">&#10003; Dedicated Public IP</strong><br>
                    IP publik dedicated tersedia untuk VPS kamu.
                  </td>
                </tr>
                <tr>
                  <td style="padding:11px 0;border-bottom:1px solid #edf2f7;font-size:13px;line-height:1.8;color:#334155;">
                    <strong style="color:#0756cf;">&#10003; Region Sidoarjo</strong><br>
                    Pilihan lokasi layanan VPS di Indonesia.
                  </td>
                </tr>
                <tr>
                  <td style="padding:11px 0;font-size:13px;line-height:1.8;color:#334155;">
                    <strong style="color:#0756cf;">&#10003; Spesifikasi Fleksibel</strong><br>
                    Sesuaikan CPU, RAM, storage, dan bandwidth sesuai kebutuhan.
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin:30px 0 12px;">
                <h2 style="font-size:21px;line-height:1.4;font-weight:800;color:#102d68;margin:0 0 10px;">
                  Siap Upgrade VPS Kamu?
                </h2>

                <p style="font-size:13px;line-height:1.8;color:#64748b;margin:0 0 20px;">
                  Kunjungi website Masdika Cloud dan sesuaikan spesifikasi VPS dengan kebutuhanmu.
                </p>

                <a href="https://www.masdika.id/vps" target="_blank"
                  style="display:inline-block;padding:15px 29px;background-color:#087cf5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;border-radius:5px;">
                  Lihat Layanan VPS &rarr;
                </a>

                <p style="font-size:12px;margin:17px 0 0;">
                  <a href="https://www.masdika.id/vps" target="_blank"
                    style="color:#087cf5;text-decoration:underline;">
                    www.masdika.id/vps
                  </a>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:23px 22px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-family:'Plus Jakarta Sans','Inter',Arial,sans-serif;">
              <a href="https://www.masdika.id" target="_blank" style="text-decoration:none;">
                <img
                  src="https://cdn.droptocdn.com/files/06f1876b-91d4-4ecf-86c8-4a3ff6257c4f/masdika-logo-light-mode.svg"
                  alt="Masdika Cloud"
                  width="135"
                  style="display:block;width:135px;height:auto;border:0;margin:0 auto;"
                >
              </a>

              <p style="font-size:11px;line-height:1.8;color:#64748b;margin:13px 0 8px;">
                Infrastruktur cloud untuk bisnis, aplikasi, dan proyek digital kamu.
              </p>

              <p style="font-size:10px;line-height:1.8;color:#94a3b8;margin:0;">
                Email ini dikirim ke akun terdaftar di Masdika Cloud Platform.<br>
                © {year} PT Masdika Teknologi Indonesia. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
  },
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
  // Saved Custom Templates, System Template Filters & Signature State
  const SAVED_TEMPLATES_STORAGE_KEY = "masdika_email_blast_saved_templates";
  const DELETED_SYSTEM_TEMPLATES_KEY = "masdika_email_blast_deleted_system_templates";
  const SIGNATURE_STORAGE_KEY = "masdika_email_blast_signature";

  const [savedTemplates, setSavedTemplates] = useState<{
    id: string;
    name: string;
    subject: string;
    html: string;
    createdAt: string;
  }[]>([]);
  const [deletedSystemTemplateIds, setDeletedSystemTemplateIds] = useState<string[]>([]);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string; isCustom: boolean } | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSubject, setNewTemplateSubject] = useState("");
  const [templateTab, setTemplateTab] = useState<"all" | "saved" | "system">("all");
  const [templateSearch, setTemplateSearch] = useState("");

  // Signature Modal State
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState({
    name: "Masdika Cloud Team",
    title: "Customer Care & Operations",
    company: "PT Masdika Teknologi Indonesia",
    website: "https://www.masdika.id",
    email: "support@masdika.id",
    phone: "+62 812-3456-7890"
  });

  // Load saved templates and signature from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_TEMPLATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedTemplates(parsed);
        }
      }
      const storedDeleted = localStorage.getItem(DELETED_SYSTEM_TEMPLATES_KEY);
      if (storedDeleted) {
        const parsedDeleted = JSON.parse(storedDeleted);
        if (Array.isArray(parsedDeleted)) {
          setDeletedSystemTemplateIds(parsedDeleted);
        }
      }
      const storedSig = localStorage.getItem(SIGNATURE_STORAGE_KEY);
      if (storedSig) {
        const parsedSig = JSON.parse(storedSig);
        if (parsedSig && typeof parsedSig === "object") {
          setSignatureData(prev => ({ ...prev, ...parsedSig }));
        }
      }
    } catch (e) {
      console.error("Failed to load local blast settings:", e);
    }
  }, []);

  // Save current email as custom template
  const handleSaveCurrentAsTemplate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const templateToSave = {
      id: `custom_${Date.now()}`,
      name: newTemplateName.trim(),
      subject: newTemplateSubject.trim() || subject,
      html: htmlContent,
      createdAt: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    const updated = [templateToSave, ...savedTemplates];
    setSavedTemplates(updated);
    try {
      localStorage.setItem(SAVED_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save template to localStorage:", err);
    }

    toast.success(`Template "${templateToSave.name}" successfully saved!`);
    setShowSaveTemplateModal(false);
    setNewTemplateName("");
  };

  // Confirm delete handler for both custom and system templates
  const handleConfirmDeleteTemplate = () => {
    if (!templateToDelete) return;

    setIsDeletingTemplate(true);
    try {
      if (templateToDelete.isCustom) {
        const updated = savedTemplates.filter(t => t.id !== templateToDelete.id);
        setSavedTemplates(updated);
        localStorage.setItem(SAVED_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
        toast.success(`Template "${templateToDelete.name}" successfully deleted!`);
      } else {
        const updated = [...deletedSystemTemplateIds, templateToDelete.id];
        setDeletedSystemTemplateIds(updated);
        localStorage.setItem(DELETED_SYSTEM_TEMPLATES_KEY, JSON.stringify(updated));
        toast.success(`Template "${templateToDelete.name}" removed from library!`);
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
      toast.error("Failed to delete template");
    } finally {
      setIsDeletingTemplate(false);
      setTemplateToDelete(null);
    }
  };

  // Restore deleted system templates
  const handleRestoreSystemTemplates = () => {
    try {
      localStorage.removeItem(DELETED_SYSTEM_TEMPLATES_KEY);
      setDeletedSystemTemplateIds([]);
      toast.success("All official templates restored successfully!");
    } catch (err) {
      console.error("Failed to restore templates:", err);
      toast.error("Failed to restore templates");
    }
  };

  // Insert signature into email HTML
  const handleInsertSignature = () => {
    try {
      localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(signatureData));
    } catch {}

    const sigHtml = `
<!-- Professional Email Signature -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; padding-top: 18px; border-top: 1px dashed #cbd5e1; font-family: ${FONT_STACK}; width: 100%;">
  <tr>
    <td style="vertical-align: top; padding-right: 14px; width: 44px;">
      <div style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: #ffffff; text-align: center; line-height: 42px; font-weight: 800; font-size: 16px;">
        M
      </div>
    </td>
    <td style="vertical-align: top; font-size: 13px; line-height: 1.6; color: #475569;">
      <div style="font-weight: 800; color: #0f172a; font-size: 14px;">${signatureData.name}</div>
      <div style="color: #0891b2; font-weight: 600; font-size: 12px;">${signatureData.title} · ${signatureData.company}</div>
      <div style="margin-top: 4px; font-size: 12px;">
        🌐 <a href="${signatureData.website}" target="_blank" style="color: #087cf5; text-decoration: none;">${signatureData.website.replace(/^https?:\/\//, '')}</a>
        &nbsp;|&nbsp; ✉️ <a href="mailto:${signatureData.email}" style="color: #087cf5; text-decoration: none;">${signatureData.email}</a>
        ${signatureData.phone ? `&nbsp;|&nbsp; 📞 <span style="color: #334155;">${signatureData.phone}</span>` : ''}
      </div>
    </td>
  </tr>
</table>`;

    if (htmlContent.includes("<!-- Footer -->")) {
      setHtmlContent(prev => prev.replace("<!-- Footer -->", `${sigHtml}\n\n    <!-- Footer -->`));
    } else if (htmlContent.includes("<!-- CTA -->")) {
      setHtmlContent(prev => prev.replace("<!-- CTA -->", `<!-- CTA -->\n${sigHtml}`));
    } else {
      setHtmlContent(prev => prev + sigHtml);
    }

    setShowSignatureModal(false);
    toast.success("Signature successfully inserted into email!");
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
      .replace(/{email}/g, "customer@example.com")
      .replace(/{web_version_url}/g, "https://www.masdika.id/vps");

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
  const handleSelectTemplate = (template: { name: string; subject: string; html: string }) => {
    setSubject(template.subject);
    setHtmlContent(template.html);
    setShowTemplatesModal(false);
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
              onClick={() => {
                setNewTemplateName("");
                setNewTemplateSubject(subject);
                setShowSaveTemplateModal(true);
              }}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
              title="Save current email as new template"
            >
              <Save className="w-4 h-4" />
              <span className="text-[10px]">Save</span>
            </button>
            <button
              type="button"
              onClick={() => toast.info("Attachments can be shared via downloadable document links in the email body.")}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
              title="Attachment Info"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-[10px]">Attach</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
              title="Manage & Insert Email Signature"
            >
              <PenTool className="w-4 h-4" />
              <span className="text-[10px]">Signature</span>
            </button>

            {/* Templates Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowTemplatesModal(true)}
              className="flex flex-col items-center gap-1 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0 relative"
              title="Browse Official & Saved Email Templates"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px]">Templates</span>
              {(savedTemplates.length > 0) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400"></span>
              )}
            </button>

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

      {/* MODAL: Templates Library Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn(
            "w-full max-w-2xl rounded-2xl border p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
            isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            {/* Header: Clean & uncluttered on mobile */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-800/80 mb-3 shrink-0 gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight">Email Templates</h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-snug">
                    Choose a ready-to-use template or manage your saved drafts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 -mr-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action: Save Current Email Draft */}
            <div className="mb-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNewTemplateName("");
                  setNewTemplateSubject(subject);
                  setShowSaveTemplateModal(true);
                }}
                className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 hover:border-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Save Draft as Template</span>
              </button>
            </div>

            {/* Filter Tabs & Search */}
            {(() => {
              const activeSystemList = PROMO_TEMPLATES.filter(t => !deletedSystemTemplateIds.includes(t.id));
              const totalCount = activeSystemList.length + savedTemplates.length;

              return (
                <div className="space-y-2.5 mb-3 shrink-0">
                  {/* Segmented 3-Column Tabs (Responsive Grid) */}
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold text-center">
                    <button
                      type="button"
                      onClick={() => setTemplateTab("all")}
                      className={cn(
                        "py-1.5 px-1 sm:px-2 rounded-lg transition-all cursor-pointer truncate",
                        templateTab === "all"
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateTab("saved")}
                      className={cn(
                        "py-1.5 px-1 sm:px-2 rounded-lg transition-all cursor-pointer truncate flex items-center justify-center gap-1",
                        templateTab === "saved"
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      <Bookmark className="w-3 h-3 shrink-0 hidden sm:inline" />
                      <span>Saved ({savedTemplates.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateTab("system")}
                      className={cn(
                        "py-1.5 px-1 sm:px-2 rounded-lg transition-all cursor-pointer truncate",
                        templateTab === "system"
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      Official ({activeSystemList.length})
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder="Search templates by name or subject..."
                      className={cn(
                        "w-full pl-8 pr-8 py-2 rounded-xl border text-xs outline-none transition-colors",
                        isDark
                          ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                      )}
                    />
                    {templateSearch && (
                      <button
                        type="button"
                        onClick={() => setTemplateSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Templates List */}
            <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {(() => {
                // Combine and filter templates
                const activeSystemList = PROMO_TEMPLATES
                  .filter(t => !deletedSystemTemplateIds.includes(t.id))
                  .map(t => ({
                    ...t,
                    isCustom: false,
                    createdAt: "Official System"
                  }));

                const customList = savedTemplates.map(t => ({
                  ...t,
                  isCustom: true
                }));

                let combined: { id: string; name: string; subject: string; html: string; isCustom: boolean; createdAt?: string }[] = [];
                if (templateTab === "all") {
                  combined = [...customList, ...activeSystemList];
                } else if (templateTab === "saved") {
                  combined = customList;
                } else {
                  combined = activeSystemList;
                }

                if (templateSearch.trim()) {
                  const q = templateSearch.toLowerCase();
                  combined = combined.filter(t => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
                }

                if (combined.length === 0) {
                  return (
                    <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800 space-y-2">
                      <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto opacity-50" />
                      <p className="text-xs text-zinc-400 font-medium">No templates found</p>
                      {templateTab === "saved" && (
                        <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                          You haven't saved any custom templates yet. Click <strong className="text-cyan-400">"Save Draft as Template"</strong> above to store your current email draft.
                        </p>
                      )}
                      {templateTab === "system" && deletedSystemTemplateIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleRestoreSystemTemplates}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Restore {deletedSystemTemplateIds.length} Deleted Official Templates</span>
                        </button>
                      )}
                    </div>
                  );
                }

                return combined.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={cn(
                      "p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col gap-2.5 group",
                      isDark
                        ? "bg-[#060b14]/70 border-slate-800 hover:border-cyan-500/40 hover:bg-[#060b14]"
                        : "bg-slate-50 border-slate-200 hover:border-cyan-400 hover:bg-white"
                    )}
                  >
                    {/* Top: Title & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-cyan-400 break-words leading-snug flex-1">
                        {tpl.name}
                      </h4>
                      {tpl.isCustom ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Bookmark className="w-2.5 h-2.5" />
                          <span>Saved</span>
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                          ⚡ Official
                        </span>
                      )}
                    </div>

                    {/* Middle: Subject preview */}
                    <div className="text-xs text-zinc-400 leading-relaxed break-words line-clamp-2">
                      <span className="text-zinc-500 font-medium mr-1.5">Subject:</span>
                      <span className={cn(isDark ? "text-zinc-300" : "text-slate-700")}>
                        {tpl.subject || "(No Subject)"}
                      </span>
                    </div>

                    {tpl.isCustom && tpl.createdAt && (
                      <div className="text-[10px] text-zinc-500">
                        Saved: {tpl.createdAt}
                      </div>
                    )}

                    {/* Bottom Action Row (Mobile & Desktop Friendly) */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 mt-0.5">
                      <button
                        type="button"
                        onClick={() => setTemplateToDelete({ id: tpl.id, name: tpl.name, isCustom: tpl.isCustom })}
                        title="Delete template"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleSelectTemplate(tpl);
                          setShowTemplatesModal(false);
                        }}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                        <span>Use Template</span>
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 mt-2 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Stored locally in your browser.</span>
                {deletedSystemTemplateIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreSystemTemplates}
                    className="text-cyan-400 hover:underline cursor-pointer font-medium"
                  >
                    Restore ({deletedSystemTemplateIds.length}) official templates
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="px-3 py-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer self-end sm:self-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Save Current Email As Template */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn(
            "w-full max-w-md rounded-2xl border p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col",
            isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Save as Template</h3>
                  <p className="text-xs text-zinc-500">Save current email draft to reuse anytime.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. VPS Upgrade & Promo Announcement"
                  className={cn(
                    "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors",
                    isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={newTemplateSubject}
                  onChange={(e) => setNewTemplateSubject(e.target.value)}
                  placeholder="Default subject for this template"
                  className={cn(
                    "w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors",
                    isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600"
                  )}
                />
              </div>

              <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-xs text-zinc-400">
                <span className="text-cyan-400 font-semibold block mb-0.5">💡 Saved to Custom Templates</span>
                This template will appear in the <strong className="text-white">Templates</strong> library and can be loaded with one click.
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer shadow-xs"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Email Signature Editor & Inserter */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn(
            "w-full max-w-lg rounded-2xl border p-4 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col",
            isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Email Signature</h3>
                  <p className="text-xs text-zinc-500">Configure sender identity and insert signature into email.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Sender Name / Team</label>
                  <input
                    type="text"
                    value={signatureData.name}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, name: e.target.value }))}
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Title / Role</label>
                  <input
                    type="text"
                    value={signatureData.title}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, title: e.target.value }))}
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Company</label>
                  <input
                    type="text"
                    value={signatureData.company}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, company: e.target.value }))}
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Website</label>
                  <input
                    type="text"
                    value={signatureData.website}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, website: e.target.value }))}
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={signatureData.email}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, email: e.target.value }))}
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition-colors font-mono",
                      isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Phone / WhatsApp (Optional)</label>
                  <input
                    type="text"
                    value={signatureData.phone}
                    onChange={(e) => setSignatureData(prev => ({ ...prev, phone: e.target.value }))}
                    className={cn(
                      "w-full px-3.5 py-2 rounded-xl border text-xs outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600"
                    )}
                  />
                </div>
              </div>

              {/* Live Signature Preview Card */}
              <div className="mt-3">
                <span className="block text-xs font-semibold text-zinc-400 mb-1.5">Signature Live Preview:</span>
                <div className="p-3.5 rounded-xl border border-white/10 bg-black/30 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-cyan-400 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    M
                  </div>
                  <div className="text-xs space-y-0.5 min-w-0">
                    <div className="font-bold text-white text-sm">{signatureData.name}</div>
                    <div className="text-cyan-400 font-semibold">{signatureData.title} · {signatureData.company}</div>
                    <div className="text-zinc-400 text-[11px] pt-1">
                      <span>🌐 {signatureData.website}</span>
                      <span className="mx-1.5">|</span>
                      <span>✉️ {signatureData.email}</span>
                      {signatureData.phone && (
                        <>
                          <span className="mx-1.5">|</span>
                          <span>📞 {signatureData.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2 shrink-0 mt-3">
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertSignature}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Insert Signature into Email</span>
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

      {/* MODAL: Confirm Delete Template Modal */}
      <ConfirmModal
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleConfirmDeleteTemplate}
        title="Delete Email Template?"
        description={
          templateToDelete?.isCustom
            ? `Are you sure you want to delete the saved template "${templateToDelete?.name}"? This action cannot be undone.`
            : `Are you sure you want to remove the official template "${templateToDelete?.name}" from your template list? You can restore official templates at any time.`
        }
        confirmText="Yes, Delete Template"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingTemplate}
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
